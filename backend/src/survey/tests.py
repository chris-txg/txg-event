from datetime import date
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from survey.models import Answer, Question, QuestionChoice, Survey, SurveyResponse

User = get_user_model()


class SurveyTests(APITestCase):
    def setUp(self) -> None:
        self.user1 = User.objects.create_user(
            username="survey_creator",
            email="creator@example.com",
            password="StrongPassword123!",
        )
        self.user2 = User.objects.create_user(
            username="respondent_user",
            email="respondent@example.com",
            password="StrongPassword123!",
        )
        self.client.force_authenticate(user=self.user1)

        self.surveys_url = reverse("survey_list_create")
        self.my_submissions_url = reverse("survey_my_submissions")

    def test_create_survey(self) -> None:
        payload = {
            "title": "Customer Feedback 2026",
            "description": "Annual customer feedback questionnaire",
            "visibility": Survey.Visibility.PUBLIC,
            "allow_anonymous": True,
            "duplicate_rule": Survey.DuplicateRule.ONE_PER_USER,
        }
        res = self.client.post(self.surveys_url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["title"], "Customer Feedback 2026")
        self.assertEqual(res.data["status"], Survey.Status.DRAFT)
        self.assertEqual(res.data["created_by_username"], "survey_creator")

    def test_add_questions_and_choices(self) -> None:
        survey = Survey.objects.create(title="Product Survey", created_by=self.user1)
        questions_url = reverse("survey_questions_create", kwargs={"id": survey.id})

        # 1. Text Question
        q1_res = self.client.post(
            questions_url,
            {"text": "What is your feedback?", "question_type": Question.QuestionType.TEXT, "is_required": True},
            format="json",
        )
        self.assertEqual(q1_res.status_code, status.HTTP_201_CREATED)

        # 2. Single Choice Question with inline choices
        q2_res = self.client.post(
            questions_url,
            {
                "text": "How did you hear about us?",
                "question_type": Question.QuestionType.SINGLE,
                "is_required": True,
                "choices": ["Google", "Social Media", "Friend"],
            },
            format="json",
        )
        self.assertEqual(q2_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(q2_res.data["choices"]), 3)

        # 3. Number Question
        q3_res = self.client.post(
            questions_url,
            {"text": "Rate us from 1 to 10", "question_type": Question.QuestionType.NUMBER, "is_required": False},
            format="json",
        )
        self.assertEqual(q3_res.status_code, status.HTTP_201_CREATED)

        survey.refresh_from_db()
        self.assertEqual(survey.questions.count(), 3)

    def test_publish_and_close_survey(self) -> None:
        survey = Survey.objects.create(title="Event Survey", created_by=self.user1)
        publish_url = reverse("survey_publish", kwargs={"id": survey.id})
        close_url = reverse("survey_close", kwargs={"id": survey.id})

        # Cannot publish without questions
        pub_fail = self.client.post(publish_url)
        self.assertEqual(pub_fail.status_code, status.HTTP_400_BAD_REQUEST)

        # Add a question
        Question.objects.create(survey=survey, text="Are you coming?", question_type=Question.QuestionType.BOOLEAN)

        # Now publish
        pub_res = self.client.post(publish_url)
        self.assertEqual(pub_res.status_code, status.HTTP_200_OK)
        survey.refresh_from_db()
        self.assertEqual(survey.status, Survey.Status.PUBLISHED)
        self.assertTrue(survey.is_active)

        # Close survey
        close_res = self.client.post(close_url)
        self.assertEqual(close_res.status_code, status.HTTP_200_OK)
        survey.refresh_from_db()
        self.assertEqual(survey.status, Survey.Status.CLOSED)
        self.assertFalse(survey.is_active)

    def test_survey_listing_and_mine_filter(self) -> None:
        s1 = Survey.objects.create(title="Creator Survey 1", created_by=self.user1, status=Survey.Status.DRAFT)
        s2 = Survey.objects.create(title="Creator Survey 2", created_by=self.user1, status=Survey.Status.PUBLISHED)
        s3 = Survey.objects.create(title="Other User Survey", created_by=self.user2, status=Survey.Status.PUBLISHED)

        # Authenticated as user1 with ?mine=true
        res_mine = self.client.get(f"{self.surveys_url}?mine=true")
        self.assertEqual(res_mine.status_code, status.HTTP_200_OK)
        ids = [item["id"] for item in res_mine.data["results"]]
        self.assertIn(str(s1.id), ids)
        self.assertIn(str(s2.id), ids)
        self.assertNotIn(str(s3.id), ids)

        # Default listing: shows published surveys
        res_all = self.client.get(self.surveys_url)
        all_ids = [item["id"] for item in res_all.data["results"]]
        self.assertIn(str(s2.id), all_ids)
        self.assertIn(str(s3.id), all_ids)
        self.assertNotIn(str(s1.id), all_ids)

    def test_submit_survey_response_flow(self) -> None:
        # Create published survey
        survey = Survey.objects.create(
            title="Attendee Experience Survey",
            created_by=self.user1,
            status=Survey.Status.PUBLISHED,
            allow_anonymous=True,
            duplicate_rule=Survey.DuplicateRule.ONE_PER_USER,
        )

        q_text = Question.objects.create(
            survey=survey, text="Any suggestions?", question_type=Question.QuestionType.TEXT, is_required=True
        )
        q_rate = Question.objects.create(
            survey=survey, text="Overall rating (1-5)", question_type=Question.QuestionType.NUMBER, is_required=True
        )
        q_single = Question.objects.create(
            survey=survey, text="Preferred venue", question_type=Question.QuestionType.SINGLE, is_required=True
        )
        c1 = QuestionChoice.objects.create(question=q_single, text="Indoor Hall", order=0)
        c2 = QuestionChoice.objects.create(question=q_single, text="Outdoor Lawn", order=1)

        q_multi = Question.objects.create(
            survey=survey, text="Dietary preferences", question_type=Question.QuestionType.MULTIPLE, is_required=False
        )
        QuestionChoice.objects.create(question=q_multi, text="Vegan", order=0)
        QuestionChoice.objects.create(question=q_multi, text="Gluten-Free", order=1)
        QuestionChoice.objects.create(question=q_multi, text="Vegetarian", order=2)

        submit_url = reverse("public_survey_submit", kwargs={"id": survey.id})

        # Submit as user2
        self.client.force_authenticate(user=self.user2)
        payload = {
            "answers": [
                {"question_id": str(q_text.id), "value": "Great organization and audio visuals!"},
                {"question_id": str(q_rate.id), "value": 5},
                {"question_id": str(q_single.id), "value": "Indoor Hall"},
                {"question_id": str(q_multi.id), "value": ["Vegan", "Gluten-Free"]},
            ]
        }
        res = self.client.post(submit_url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SurveyResponse.objects.filter(survey=survey).count(), 1)

        # Test duplicate submission rejection (ONE_PER_USER)
        res_dup = self.client.post(submit_url, payload, format="json")
        self.assertEqual(res_dup.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already submitted", str(res_dup.data))

        # Test My Submissions endpoint
        my_res = self.client.get(self.my_submissions_url)
        self.assertEqual(my_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(my_res.data["results"]), 1)
        self.assertEqual(my_res.data["results"][0]["survey_title"], "Attendee Experience Survey")
        self.assertEqual(len(my_res.data["results"][0]["answers"]), 4)

    def test_anonymous_submission(self) -> None:
        survey = Survey.objects.create(
            title="Public Quick Poll",
            created_by=self.user1,
            status=Survey.Status.PUBLISHED,
            allow_anonymous=True,
            duplicate_rule=Survey.DuplicateRule.ALLOW_MULTIPLE,
        )
        q = Question.objects.create(survey=survey, text="Will you attend?", question_type=Question.QuestionType.BOOLEAN)

        submit_url = reverse("public_survey_submit", kwargs={"id": survey.id})

        # Anonymous client
        self.client.logout()
        res = self.client.post(
            submit_url,
            {"answers": [{"question_id": str(q.id), "value": True}]},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        resp_obj = SurveyResponse.objects.get(survey=survey)
        self.assertIsNone(resp_obj.user)
        self.assertEqual(resp_obj.answers.first().value, True)

    def test_invalid_answer_type_rejected(self) -> None:
        survey = Survey.objects.create(
            title="Type Validation Survey",
            created_by=self.user1,
            status=Survey.Status.PUBLISHED,
            allow_anonymous=True,
        )
        q_num = Question.objects.create(survey=survey, text="Age", question_type=Question.QuestionType.NUMBER)

        submit_url = reverse("public_survey_submit", kwargs={"id": survey.id})
        self.client.logout()

        # Submit string for number
        res = self.client.post(
            submit_url,
            {"answers": [{"question_id": str(q_num.id), "value": "not_a_number"}]},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_survey_analytics(self) -> None:
        survey = Survey.objects.create(
            title="Analytics Survey",
            created_by=self.user1,
            status=Survey.Status.PUBLISHED,
        )
        q_num = Question.objects.create(survey=survey, text="Score", question_type=Question.QuestionType.NUMBER)
        q_bool = Question.objects.create(survey=survey, text="Satisfied?", question_type=Question.QuestionType.BOOLEAN)

        # Create two responses
        r1 = SurveyResponse.objects.create(survey=survey)
        Answer.objects.create(response=r1, question=q_num, value=10)
        Answer.objects.create(response=r1, question=q_bool, value=True)

        r2 = SurveyResponse.objects.create(survey=survey)
        Answer.objects.create(response=r2, question=q_num, value=8)
        Answer.objects.create(response=r2, question=q_bool, value=False)

        analytics_url = reverse("survey_analytics", kwargs={"id": survey.id})
        self.client.force_authenticate(user=self.user1)
        res = self.client.get(analytics_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["total_responses"], 2)

        # Check numeric aggregation
        num_stat = next(item for item in res.data["questions"] if item["question_id"] == str(q_num.id))
        self.assertEqual(num_stat["summary"]["avg"], 9.0)
        self.assertEqual(num_stat["summary"]["max"], 10.0)
        self.assertEqual(num_stat["summary"]["min"], 8.0)
