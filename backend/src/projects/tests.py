import os
import shutil
import tempfile
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from projects.models import EventProject, EventProjectDocument
from survey.models import Survey

User = get_user_model()


class EventProjectTests(APITestCase):
    def setUp(self) -> None:
        self.user1 = User.objects.create_user(
            username="organiser1",
            email="organiser1@example.com",
            password="StrongPassword123!",
        )
        self.user2 = User.objects.create_user(
            username="organiser2",
            email="organiser2@example.com",
            password="StrongPassword123!",
        )
        self.client.force_authenticate(user=self.user1)
        self.list_create_url = reverse("project_list_create")

        self.temp_media_dir = tempfile.mkdtemp()
        self._media_override = override_settings(MEDIA_ROOT=self.temp_media_dir)
        self._media_override.enable()

        self.valid_payload = {
            "status": EventProject.Status.CREATED,
            "project_name": "Annual Tech Conference",
            "event_segment": "Corporate / Institutional",
            "event_category": "Technology Summit",
            "event_subcategory": "AI & Cloud",
            "project_description": "Two-day developer and enterprise summit.",
            "event_objective": "Evaluate demand and speaker interest.",
            "organiser_name": "Alex Morgan",
            "designation": "Program Director",
            "official_email": "alex@example.com",
            "contact_number": "+91 9876543210",
            "event_country": "India",
            "event_state": "Karnataka",
            "event_city": "Bengaluru",
            "event_locality": "Indiranagar",
            "organiser_country": "India",
            "organiser_region": "South",
            "proposed_date": "2026-12-15",
            "duration": "2 days",
            "expected_attendance": "200-300",
            "event_format": "Physical",
            "target_audience": "Engineers and architects",
            "estimated_budget_range": "500000-800000",
            "currency": "INR",
            "required_services": ["Research", "Audience Surveys"],
            "research_objective": "Validate ticket pricing and preferred tracks.",
            "research_start_date": "2026-11-15",
            "research_end_date": "2026-11-30",
        }

    def tearDown(self) -> None:
        self._media_override.disable()
        if os.path.exists(self.temp_media_dir):
            shutil.rmtree(self.temp_media_dir, ignore_errors=True)

    def test_create_project_success(self) -> None:
        res = self.client.post(self.list_create_url, self.valid_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["project_name"], "Annual Tech Conference")
        self.assertEqual(res.data["status"], EventProject.Status.CREATED)
        self.assertEqual(res.data["required_services"], ["Research", "Audience Surveys"])

    def test_save_as_draft_allows_minimal_fields(self) -> None:
        res = self.client.post(
            self.list_create_url,
            {"status": EventProject.Status.DRAFT, "project_name": "Early Draft Idea"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["status"], EventProject.Status.DRAFT)

        # Draft project can also have a survey attached
        survey_res = self.client.post(
            reverse("survey_list_create"),
            {"project": res.data["id"], "title": "Draft Project Survey"},
            format="json",
        )
        self.assertEqual(survey_res.status_code, status.HTTP_201_CREATED)

    def test_create_project_missing_required_fields_rejected(self) -> None:
        res = self.client.post(
            self.list_create_url,
            {"status": EventProject.Status.CREATED, "project_name": "Incomplete"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("event_city", res.data)
        self.assertIn("research_objective", res.data)

    def test_upload_and_delete_supporting_document(self) -> None:
        doc = SimpleUploadedFile("brief.pdf", b"%PDF-1.4 sample content", content_type="application/pdf")
        payload = {
            **self.valid_payload,
            "required_services": '["Research", "Audience Surveys"]',
            "supporting_documents": [doc],
        }
        res = self.client.post(self.list_create_url, payload, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(res.data["documents"]), 1)
        doc_id = res.data["documents"][0]["id"]
        doc_obj = EventProjectDocument.objects.get(id=doc_id)
        file_path = doc_obj.file.path
        self.assertTrue(os.path.exists(file_path))

        del_url = reverse("project_document_delete", kwargs={"id": res.data["id"], "doc_id": doc_id})
        del_res = self.client.delete(del_url)
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(os.path.exists(file_path))

    def test_blocked_document_extension_rejected(self) -> None:
        bad_file = SimpleUploadedFile("payload.exe", b"MZ...", content_type="application/octet-stream")
        payload = {**self.valid_payload, "supporting_documents": [bad_file]}
        res = self.client.post(self.list_create_url, payload, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("supporting_documents", res.data)

    def test_project_ownership_and_project_surveys_endpoint(self) -> None:
        project = EventProject.objects.create(owner=self.user1, project_name="Owner Project")
        Survey.objects.create(project=project, created_by=self.user1, title="Project Survey 1")

        surveys_url = reverse("project_surveys", kwargs={"id": project.id})
        res = self.client.get(surveys_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)

        # User 2 cannot access user 1's project
        self.client.force_authenticate(user=self.user2)
        detail_url = reverse("project_detail", kwargs={"id": project.id})
        self.assertEqual(self.client.get(detail_url).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get(surveys_url).status_code, status.HTTP_403_FORBIDDEN)

