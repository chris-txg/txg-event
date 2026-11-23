from datetime import date, timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import CustomerProfile, CustomerType, RoleChoices, UserType
from projects.models import EventProject
from survey.models import (
    Answer,
    Coupon,
    CouponUsage,
    Question,
    QuestionChoice,
    Survey,
    SurveyPricingOption,
    SurveyResponse,
)

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds initial test data (users, projects, surveys, questions, responses) with < 5 rows each. Idempotent by default."

    def add_arguments(self, parser):
        parser.add_argument(
            "--coupons-only",
            action="store_true",
            help="Seed only the sample coupon codes without creating or touching users, projects, or surveys.",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Wipe and recreate test surveys, projects, and coupons cleanly.",
        )

    def handle(self, *args, **options):
        coupons_only = options.get("coupons_only", False)
        reset = options.get("reset", False)

        self.stdout.write(self.style.NOTICE("Seeding development data..."))

        with transaction.atomic():
            # If --reset, safely remove previous test data
            if reset:
                self.stdout.write(self.style.WARNING("Reset requested: cleaning up test data..."))
                CouponUsage.objects.all().delete()
                Coupon.objects.filter(code__in=["LAUNCH50", "VIPFREE"]).delete()
                SurveyResponse.objects.filter(survey__title__in=[
                    "AI Summit Track & Keynote Interest",
                    "Startup Pitch Logistics & Stage Requirements",
                    "Music Fest Attendee Experience Feedback",
                ]).delete()
                Survey.objects.filter(title__in=[
                    "AI Summit Track & Keynote Interest",
                    "Startup Pitch Logistics & Stage Requirements",
                    "Music Fest Attendee Experience Feedback",
                ]).delete()
                EventProject.objects.filter(project_name__in=[
                    "AI & Tech Summit 2026",
                    "Startup Pitch & Networking Night",
                    "Annual Music & Arts Fest",
                ]).delete()

            # -------------------------------------------------------------
            # 1. Pricing Options
            # -------------------------------------------------------------
            free_plan, _ = SurveyPricingOption.objects.get_or_create(
                code="free",
                defaults={
                    "name": "Free Tier",
                    "description": "Publish 1 survey for free",
                    "price": Decimal("0.00"),
                    "currency": "INR",
                    "is_free": True,
                    "free_limit_per_user": 1,
                    "is_active": True,
                    "display_order": 1,
                    "features": [
                        "1 Free survey publish",
                        "Full survey builder access",
                    ],
                },
            )

            standard_plan, _ = SurveyPricingOption.objects.get_or_create(
                code="standard",
                defaults={
                    "name": "Standard Plan",
                    "description": "Standard publishing fee",
                    "price": Decimal("499.00"),
                    "currency": "INR",
                    "is_free": False,
                    "free_limit_per_user": 0,
                    "is_active": True,
                    "display_order": 2,
                    "features": [
                        "Unlimited responses",
                        "Export analytics to CSV/Excel",
                    ],
                },
            )

            # -------------------------------------------------------------
            # 1B. Coupons
            # -------------------------------------------------------------
            launch50, l_created = Coupon.objects.get_or_create(
                code="LAUNCH50",
                defaults={
                    "description": "Launch promo: 50% discount on standard plan",
                    "discount_type": Coupon.DiscountType.PERCENTAGE,
                    "discount_value": Decimal("50.00"),
                    "max_uses": 100,
                    "max_uses_per_user": 1,
                    "is_active": True,
                },
            )
            launch50.applicable_plans.add(standard_plan)

            vipfree, v_created = Coupon.objects.get_or_create(
                code="VIPFREE",
                defaults={
                    "description": "VIP Pass: 100% off standard plan (free publishing)",
                    "discount_type": Coupon.DiscountType.PERCENTAGE,
                    "discount_value": Decimal("100.00"),
                    "max_uses": 50,
                    "max_uses_per_user": 1,
                    "is_active": True,
                },
            )
            vipfree.applicable_plans.add(standard_plan)

            if l_created or v_created:
                self.stdout.write(self.style.SUCCESS("Created sample coupons (LAUNCH50, VIPFREE)."))
            else:
                self.stdout.write(self.style.SUCCESS("Coupons LAUNCH50 & VIPFREE already exist. No duplicates created."))

            # If user only wanted coupons, we stop right here!
            if coupons_only:
                self.stdout.write(self.style.SUCCESS("Coupons-only seed complete. Users and surveys were not touched."))
                return

            # -------------------------------------------------------------
            # 2. Users (Password: event@2026)
            # -------------------------------------------------------------
            password = "event@2026"
            users_data = [
                {
                    "username": "admin",
                    "email": "admin@example.com",
                    "first_name": "Admin",
                    "last_name": "User",
                    "user_type": UserType.ADMIN,
                    "role": RoleChoices.ADMIN,
                    "is_staff": True,
                    "is_superuser": True,
                },
                {
                    "username": "alice",
                    "email": "alice@example.com",
                    "first_name": "Alice",
                    "last_name": "Organiser",
                    "user_type": UserType.CUSTOMER,
                    "role": RoleChoices.ORGANIZER,
                    "is_staff": False,
                    "is_superuser": False,
                },
                {
                    "username": "bob",
                    "email": "bob@example.com",
                    "first_name": "Bob",
                    "last_name": "Organiser",
                    "user_type": UserType.CUSTOMER,
                    "role": RoleChoices.ORGANIZER,
                    "is_staff": False,
                    "is_superuser": False,
                },
                {
                    "username": "charlie",
                    "email": "charlie@example.com",
                    "first_name": "Charlie",
                    "last_name": "Attendee",
                    "user_type": UserType.CUSTOMER,
                    "role": RoleChoices.ATTENDEE,
                    "is_staff": False,
                    "is_superuser": False,
                },
            ]

            users = {}
            for udata in users_data:
                uname = udata["username"]
                user, created = User.objects.get_or_create(
                    username=uname,
                    defaults={
                        "email": udata["email"],
                        "first_name": udata["first_name"],
                        "last_name": udata["last_name"],
                        "user_type": udata["user_type"],
                        "role": udata["role"],
                        "is_staff": udata["is_staff"],
                        "is_superuser": udata["is_superuser"],
                        "is_verified": True,
                    },
                )
                user.set_password(password)
                user.is_verified = True
                user.save()
                users[uname] = user

                if udata["user_type"] == UserType.CUSTOMER:
                    CustomerProfile.objects.get_or_create(
                        user=user,
                        defaults={
                            "customer_type": CustomerType.B2C,
                            "city": "Bengaluru",
                            "country": "India",
                        },
                    )

            self.stdout.write(self.style.SUCCESS(f"Created {len(users)} users (password: {password})."))

            # -------------------------------------------------------------
            # 3. Projects (Total: 3 projects < 5)
            # -------------------------------------------------------------
            alice = users["alice"]
            bob = users["bob"]
            charlie = users["charlie"]

            proj1, _ = EventProject.objects.get_or_create(
                project_name="AI & Tech Summit 2026",
                owner=alice,
                defaults={
                    "event_segment": "Technology",
                    "event_category": "Conference",
                    "event_subcategory": "Artificial Intelligence",
                    "project_description": "Annual flagship technology summit for AI developers and architects.",
                    "event_country": "India",
                    "event_state": "Karnataka",
                    "event_city": "Bengaluru",
                    "proposed_date": date.today() + timedelta(days=60),
                    "duration": "2 Days",
                    "expected_attendance": "500",
                    "event_format": "In-Person",
                    "target_audience": "Tech Enthusiasts & Engineers",
                },
            )

            proj2, _ = EventProject.objects.get_or_create(
                project_name="Startup Pitch & Networking Night",
                owner=alice,
                defaults={
                    "event_segment": "Business",
                    "event_category": "Networking",
                    "event_subcategory": "Venture Pitch",
                    "project_description": "Exclusive angel investor pitch and founders mixer.",
                    "event_country": "India",
                    "event_state": "Maharashtra",
                    "event_city": "Mumbai",
                    "proposed_date": date.today() + timedelta(days=90),
                    "duration": "1 Evening",
                    "expected_attendance": "120",
                    "event_format": "Hybrid",
                    "target_audience": "Founders & Investors",
                },
            )

            proj3, _ = EventProject.objects.get_or_create(
                project_name="Annual Music & Arts Fest",
                owner=bob,
                defaults={
                    "event_segment": "Entertainment",
                    "event_category": "Festival",
                    "event_subcategory": "Live Music",
                    "project_description": "Three days of indie music, art exhibits, and workshops.",
                    "event_country": "India",
                    "event_state": "Goa",
                    "event_city": "Panaji",
                    "proposed_date": date.today() + timedelta(days=120),
                    "duration": "3 Days",
                    "expected_attendance": "1500",
                    "event_format": "Outdoor",
                    "target_audience": "General Public",
                },
            )
            self.stdout.write(self.style.SUCCESS("Created 3 projects."))

            # -------------------------------------------------------------
            # 4. Surveys (Total: 3 surveys < 5)
            # -------------------------------------------------------------
            # Survey 1: Published under Free tier (by Alice)
            survey1, s1_created = Survey.objects.get_or_create(
                title="AI Summit Track & Keynote Interest",
                project=proj1,
                created_by=alice,
                defaults={
                    "description": "Tell us which topics and keynote speakers you are most interested in.",
                    "status": Survey.Status.PUBLISHED,
                    "is_paid": True,
                    "pricing_option": free_plan,
                    "visibility": Survey.Visibility.PUBLIC,
                    "allow_anonymous": True,
                },
            )
            if s1_created:
                q1 = Question.objects.create(
                    survey=survey1,
                    text="Which technology track interests you the most?",
                    question_type=Question.QuestionType.SINGLE,
                    order=1,
                    is_required=True,
                )
                QuestionChoice.objects.create(question=q1, text="Generative AI & LLMs", order=1)
                QuestionChoice.objects.create(question=q1, text="Cloud & Distributed Systems", order=2)
                QuestionChoice.objects.create(question=q1, text="Robotics & Edge Computing", order=3)

                q2 = Question.objects.create(
                    survey=survey1,
                    text="What specific topic would you like our speakers to address?",
                    question_type=Question.QuestionType.TEXT,
                    order=2,
                    is_required=False,
                )

                q3 = Question.objects.create(
                    survey=survey1,
                    text="Will you attend the VIP networking dinner?",
                    question_type=Question.QuestionType.BOOLEAN,
                    order=3,
                    is_required=True,
                )

                # Responses to Survey 1 (< 5 responses)
                resp1 = SurveyResponse.objects.create(
                    survey=survey1,
                    user=charlie,
                    respondent_ip="127.0.0.1",
                )
                Answer.objects.create(response=resp1, question=q1, value="Generative AI & LLMs")
                Answer.objects.create(response=resp1, question=q2, value="Scaling multi-agent architectures in production.")
                Answer.objects.create(response=resp1, question=q3, value=True)

                resp2 = SurveyResponse.objects.create(
                    survey=survey1,
                    user=bob,
                    respondent_ip="127.0.0.2",
                )
                Answer.objects.create(response=resp2, question=q1, value="Cloud & Distributed Systems")
                Answer.objects.create(response=resp2, question=q2, value="Serverless latency optimization.")
                Answer.objects.create(response=resp2, question=q3, value=False)

            # Survey 2: Draft (by Alice)
            survey2, s2_created = Survey.objects.get_or_create(
                title="Startup Pitch Logistics & Stage Requirements",
                project=proj2,
                created_by=alice,
                defaults={
                    "description": "Draft survey to collect AV requirements and pitch duration preferences.",
                    "status": Survey.Status.DRAFT,
                    "is_paid": False,
                    "pricing_option": None,
                    "visibility": Survey.Visibility.PUBLIC,
                    "allow_anonymous": True,
                },
            )
            if s2_created:
                q2_1 = Question.objects.create(
                    survey=survey2,
                    text="Preferred pitch length:",
                    question_type=Question.QuestionType.SINGLE,
                    order=1,
                    is_required=True,
                )
                QuestionChoice.objects.create(question=q2_1, text="3 Minutes (Lightning)", order=1)
                QuestionChoice.objects.create(question=q2_1, text="5 Minutes (Standard)", order=2)

                Question.objects.create(
                    survey=survey2,
                    text="Do you need screen sharing for a live software demo?",
                    question_type=Question.QuestionType.BOOLEAN,
                    order=2,
                    is_required=True,
                )

            # Survey 3: Published under Standard Plan (by Bob)
            survey3, s3_created = Survey.objects.get_or_create(
                title="Music Fest Attendee Experience Feedback",
                project=proj3,
                created_by=bob,
                defaults={
                    "description": "Help us improve our annual festival experience.",
                    "status": Survey.Status.PUBLISHED,
                    "is_paid": True,
                    "pricing_option": standard_plan,
                    "visibility": Survey.Visibility.PUBLIC,
                    "allow_anonymous": True,
                },
            )
            if s3_created:
                q3_1 = Question.objects.create(
                    survey=survey3,
                    text="Rate your overall satisfaction with the festival sound & stage (1 to 5):",
                    question_type=Question.QuestionType.NUMBER,
                    order=1,
                    is_required=True,
                )

                q3_2 = Question.objects.create(
                    survey=survey3,
                    text="Which performance was your personal highlight?",
                    question_type=Question.QuestionType.TEXT,
                    order=2,
                    is_required=False,
                )

                # Responses to Survey 3 (< 5 responses)
                resp3_1 = SurveyResponse.objects.create(
                    survey=survey3,
                    user=charlie,
                    respondent_ip="127.0.0.3",
                )
                Answer.objects.create(response=resp3_1, question=q3_1, value=5)
                Answer.objects.create(response=resp3_1, question=q3_2, value="The acoustic sunset set on Day 2!")

                resp3_2 = SurveyResponse.objects.create(
                    survey=survey3,
                    user=alice,
                    respondent_ip="127.0.0.4",
                )
                Answer.objects.create(response=resp3_2, question=q3_1, value=4)
                Answer.objects.create(response=resp3_2, question=q3_2, value="The indie rock headliner!")

            self.stdout.write(self.style.SUCCESS("Created 3 surveys with questions and responses."))

        self.stdout.write(self.style.SUCCESS("Dev data seed completed successfully!"))
