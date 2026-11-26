import os
import shutil
import tempfile
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import VendorCategory, VendorProfile
from projects.models import EventProject, EventProjectDocument, EventVendor
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


class EventVendorTests(APITestCase):
    def setUp(self) -> None:
        self.organizer = User.objects.create_user(
            username="organizer_test",
            email="organizer@example.com",
            password="StrongPassword123!",
        )
        self.other_user = User.objects.create_user(
            username="other_organizer",
            email="other@example.com",
            password="StrongPassword123!",
        )
        self.vendor_user1 = User.objects.create_user(
            username="vendor_caterer",
            email="caterer@example.com",
            password="StrongPassword123!",
        )
        self.vendor1 = VendorProfile.objects.create(
            user=self.vendor_user1,
            business_name="Delight Catering",
            business_category=VendorCategory.CATERING,
            city="Chennai",
            years_in_business=6,
        )
        self.vendor_user2 = User.objects.create_user(
            username="vendor_photographer",
            email="photographer@example.com",
            password="StrongPassword123!",
        )
        self.vendor2 = VendorProfile.objects.create(
            user=self.vendor_user2,
            business_name="Pixel Studio",
            business_category=VendorCategory.PHOTOGRAPHY,
            city="Bengaluru",
            years_in_business=3,
        )
        self.project = EventProject.objects.create(
            owner=self.organizer,
            project_name="Mega Music Festival",
            estimated_budget_range="500000-1000000",
        )
        self.client.force_authenticate(user=self.organizer)
        self.vendors_url = reverse("project_vendors", kwargs={"id": self.project.id})

    def test_add_and_list_event_vendors(self) -> None:
        # 1. Add Delight Catering
        res1 = self.client.post(
            self.vendors_url,
            {
                "vendor_id": str(self.vendor1.id),
                "service_type": "CATERING",
                "status": "CONFIRMED",
                "agreed_budget": 150000.00,
                "notes": "Includes 3-course dinner and beverages",
            },
            format="json",
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res1.data["vendor_name"], "Delight Catering")
        self.assertEqual(res1.data["service_type"], "CATERING")
        self.assertEqual(res1.data["status"], "CONFIRMED")

        # 2. Add Pixel Studio
        res2 = self.client.post(
            self.vendors_url,
            {
                "vendor_id": str(self.vendor2.id),
                "status": "SHORTLISTED",
            },
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res2.data["service_type"], "PHOTOGRAPHY")

        # 3. List vendors
        list_res = self.client.get(self.vendors_url)
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(list_res.data["count"], 2)

    def test_filter_event_vendors_by_query_params(self) -> None:
        EventVendor.objects.create(
            project=self.project,
            vendor=self.vendor1,
            service_type="CATERING",
            status=EventVendor.BookingStatus.CONFIRMED,
            agreed_budget=150000,
        )
        EventVendor.objects.create(
            project=self.project,
            vendor=self.vendor2,
            service_type="PHOTOGRAPHY",
            status=EventVendor.BookingStatus.SHORTLISTED,
            agreed_budget=40000,
        )

        # Filter by category
        res_cat = self.client.get(f"{self.vendors_url}?category=CATERING")
        self.assertEqual(res_cat.status_code, status.HTTP_200_OK)
        self.assertEqual(res_cat.data["count"], 1)
        self.assertEqual(res_cat.data["results"][0]["vendor_name"], "Delight Catering")

        # Filter by status
        res_status = self.client.get(f"{self.vendors_url}?status=SHORTLISTED")
        self.assertEqual(res_status.status_code, status.HTTP_200_OK)
        self.assertEqual(res_status.data["count"], 1)
        self.assertEqual(res_status.data["results"][0]["vendor_name"], "Pixel Studio")

        # Search by vendor name
        res_search = self.client.get(f"{self.vendors_url}?search=Pixel")
        self.assertEqual(res_search.status_code, status.HTTP_200_OK)
        self.assertEqual(res_search.data["count"], 1)
        self.assertEqual(res_search.data["results"][0]["vendor_name"], "Pixel Studio")

    def test_update_and_delete_event_vendor(self) -> None:
        assignment = EventVendor.objects.create(
            project=self.project,
            vendor=self.vendor2,
            service_type="PHOTOGRAPHY",
            status=EventVendor.BookingStatus.SHORTLISTED,
        )
        detail_url = reverse(
            "project_vendor_detail",
            kwargs={"id": self.project.id, "vendor_assignment_id": assignment.id},
        )

        # Update status and agreed budget
        patch_res = self.client.patch(
            detail_url,
            {"status": "CONFIRMED", "agreed_budget": 55000.00, "notes": "Advance paid"},
            format="json",
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data["status"], "CONFIRMED")
        self.assertEqual(float(patch_res.data["agreed_budget"]), 55000.0)

        # Delete
        del_res = self.client.delete(detail_url)
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(EventVendor.objects.filter(id=assignment.id).exists())

    def test_event_vendor_budget_summary(self) -> None:
        EventVendor.objects.create(
            project=self.project,
            vendor=self.vendor1,
            service_type="CATERING",
            status=EventVendor.BookingStatus.CONFIRMED,
            agreed_budget=200000,
        )
        EventVendor.objects.create(
            project=self.project,
            vendor=self.vendor2,
            service_type="PHOTOGRAPHY",
            status=EventVendor.BookingStatus.SHORTLISTED,
            agreed_budget=60000,
        )

        summary_url = reverse("project_vendors_budget_summary", kwargs={"id": self.project.id})
        res = self.client.get(summary_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["total_allocated_budget"], 260000.0)
        self.assertEqual(res.data["total_vendors_count"], 2)
        self.assertEqual(res.data["confirmed_vendors_count"], 1)
        self.assertIn("CATERING", res.data["by_service_type"])
        self.assertIn("PHOTOGRAPHY", res.data["by_service_type"])

    def test_duplicate_vendor_rejected(self) -> None:
        self.client.post(self.vendors_url, {"vendor_id": str(self.vendor1.id)}, format="json")
        res_dup = self.client.post(self.vendors_url, {"vendor_id": str(self.vendor1.id)}, format="json")
        self.assertEqual(res_dup.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("vendor_id", res_dup.data)


