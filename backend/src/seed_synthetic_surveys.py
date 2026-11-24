"""
Realistic synthetic survey seed script for Event Manager development.
Creates:
- 5 distinct published surveys
- 15 questions per survey (75 in total) covering ALL 6 question types:
  single, multiple, number, text, boolean, date
- 52 responses per survey (260 in total)
- 15 answers per response (3,900 answer records in total)
"""

import os
import sys
import uuid
import random
from datetime import datetime, timedelta
from django.utils import timezone
from django.db import transaction

# Ensure Django environment is configured
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.contrib.auth import get_user_model
from projects.models import EventProject
from survey.models import Survey, Question, QuestionChoice, SurveyResponse, Answer, SurveyPricingOption

User = get_user_model()

SURVEY_TEMPLATES = [
    {
        "title": "Annual Developer & Tech Summit 2026: Attendee Feedback & Experience",
        "description": "Comprehensive survey assessing keynote relevance, technical workshop depth, venue catering, networking spaces, and overall attendee experience for the 2026 Annual Developer Summit.",
        "visibility": "public",
        "duplicate_rule": "allow_multiple",
        "questions": [
            # 1. text
            {"type": "text", "text": "What is your primary job title or professional role?", "required": True,
             "sample_answers": ["Senior Cloud Architect", "Full Stack Engineer", "DevOps Consultant", "Engineering Director", "Product Manager", "Data Platform Lead", "Security Researcher", "Backend Lead"]},
            # 2. single
            {"type": "single", "text": "How many years of professional software industry experience do you have?", "required": True,
             "choices": ["Less than 2 years", "2 to 5 years", "6 to 10 years", "More than 10 years"]},
            # 3. multiple
            {"type": "multiple", "text": "Which technical tracks did you participate in during the summit?", "required": True,
             "choices": ["Distributed Systems & Cloud", "AI, LLMs & Machine Learning", "DevOps & Platform Engineering", "Frontend & Full Stack", "Cybersecurity & Zero Trust"]},
            # 4. number
            {"type": "number", "text": "On a scale from 1 to 10, how would you rate the overall quality of technical presentations?", "required": True,
             "num_range": (7, 10)},
            # 5. boolean
            {"type": "boolean", "text": "Did the workshops and hands-on labs provide actionable skills for your daily work?", "required": True},
            # 6. date
            {"type": "date", "text": "On which date did you arrive at the conference venue?", "required": True,
             "date_range": ("2026-06-10", "2026-06-12")},
            # 7. single
            {"type": "single", "text": "How would you rate the keynote presentation on Emerging Computing Paradigms?", "required": True,
             "choices": ["Exceeded Expectations", "Met Expectations", "Good but Too High Level", "Needs More Depth"]},
            # 8. multiple
            {"type": "multiple", "text": "What networking formats did you find most valuable?", "required": True,
             "choices": ["1-on-1 Mentorship Lounge", "Birds-of-a-Feather Roundtables", "Sponsor Showcase", "Evening Social Mixer"]},
            # 9. number
            {"type": "number", "text": "How likely are you to recommend this summit to your engineering peers (1-10)?", "required": True,
             "num_range": (8, 10)},
            # 10. text
            {"type": "text", "text": "Which technology stack or topic would you like to see featured more prominently next year?", "required": True,
             "sample_answers": ["Rust in production", "Event-driven microservices with Kafka", "Edge AI models", "Kubernetes cluster security", "PostgreSQL query optimization at scale"]},
            # 11. boolean
            {"type": "boolean", "text": "Would your organization sponsor or send larger team delegations to future summits?", "required": True},
            # 12. date
            {"type": "date", "text": "When is your preferred timeframe for attending next year's summit?", "required": True,
             "date_range": ("2026-09-01", "2026-11-30")},
            # 13. single
            {"type": "single", "text": "How satisfied were you with the venue facilities, Wi-Fi speed, and audio-visual setups?", "required": True,
             "choices": ["Extremely Satisfied", "Satisfied", "Neutral", "Needs Improvement"]},
            # 14. number
            {"type": "number", "text": "How would you rate the conference catering and refreshment breaks (1-10)?", "required": True,
             "num_range": (6, 10)},
            # 15. boolean
            {"type": "boolean", "text": "Would you like to receive invitations to submit speaking proposals for our upcoming regional events?", "required": True},
        ]
    },
    {
        "title": "Corporate Hospitality & Catering Services Assessment",
        "description": "Evaluation of executive lunch offerings, dietary accommodations, beverage selections, service professionalism, and banquet dining standards for corporate delegates.",
        "visibility": "public",
        "duplicate_rule": "allow_multiple",
        "questions": [
            # 1. text
            {"type": "text", "text": "Please state your organization or corporate delegation name.", "required": True,
             "sample_answers": ["Apex Financial Group", "Nova Global Logistics", "Quantum Health Solutions", "Zenith Technologies", "Meridian Consulting Group", "Horizon Media Corp"]},
            # 2. single
            {"type": "single", "text": "Which meal service session did your team attend most frequently?", "required": True,
             "choices": ["Executive Breakfast", "Buffet Lunch", "Afternoon Tea & Snacks", "Gala Dinner Banquet"]},
            # 3. multiple
            {"type": "multiple", "text": "Which special dietary requirements were requested by your delegation?", "required": True,
             "choices": ["Vegetarian", "Vegan / Plant-Based", "Gluten-Free", "Halal Certified", "Nut-Free / Allergen Aware", "Standard Gourmet"]},
            # 4. number
            {"type": "number", "text": "How would you rate the freshness and culinary presentation of the food (1-10)?", "required": True,
             "num_range": (7, 10)},
            # 5. boolean
            {"type": "boolean", "text": "Were all pre-notified dietary restrictions catered for accurately and without delay?", "required": True},
            # 6. date
            {"type": "date", "text": "What was the date of your primary banquet or dining event?", "required": True,
             "date_range": ("2026-05-15", "2026-05-20")},
            # 7. single
            {"type": "single", "text": "How would you assess the courtesy and responsiveness of the hospitality and service staff?", "required": True,
             "choices": ["Exceptional Service", "Prompt and Courteous", "Acceptable", "Understaffed during peak periods"]},
            # 8. multiple
            {"type": "multiple", "text": "Which beverage stations were most popular among your delegates?", "required": True,
             "choices": ["Barista Coffee Bar", "Artisan Herbal Tea Station", "Fresh Cold-Pressed Juices", "Infused Hydration Stations", "Evening Wine Tasting Bar"]},
            # 9. number
            {"type": "number", "text": "Overall satisfaction with banquet table setups and ambient dining acoustics (1-10)?", "required": True,
             "num_range": (6, 10)},
            # 10. text
            {"type": "text", "text": "Which specific dish or culinary station received the most positive compliments from your guests?", "required": True,
             "sample_answers": ["Grilled Norwegian Salmon with Dill Sauce", "Live Pasta & Risotto Station", "Truffle Mushroom Canapés", "Artisan Chocolate Fondant", "Pan-Asian Stir Fry Station"]},
            # 11. boolean
            {"type": "boolean", "text": "Did the dining schedule align well with the overall event programming without causing session delays?", "required": True},
            # 12. date
            {"type": "date", "text": "By what date will your team require final catering invoice reconciliation?", "required": True,
             "date_range": ("2026-06-01", "2026-06-30")},
            # 13. single
            {"type": "single", "text": "How would you rate the pricing and value for money of the corporate catering package?", "required": True,
             "choices": ["High Value for Investment", "Fair and Competitive", "Slightly Expensive", "Overpriced"]},
            # 14. number
            {"type": "number", "text": "Rate the cleanliness and turnover efficiency of the dining area (1-10).", "required": True,
             "num_range": (8, 10)},
            # 15. boolean
            {"type": "boolean", "text": "Would you recommend our catering and hospitality partners for other corporate functions?", "required": True},
        ]
    },
    {
        "title": "Healthcare & Medical Devices Exhibition Feasibility Study",
        "description": "Stakeholder demand analysis for clinical equipment pavilions, surgical robotics demos, CME-accredited seminars, and procurement networking.",
        "visibility": "public",
        "duplicate_rule": "allow_multiple",
        "questions": [
            # 1. text
            {"type": "text", "text": "What is your clinical specialty or hospital department affiliation?", "required": True,
             "sample_answers": ["Interventional Cardiology", "Orthopedic Surgery", "Hospital Procurement & Supply Chain", "Biomedical Engineering", "Radiology & Imaging", "Diagnostic Pathology", "Critical Care Medicine"]},
            # 2. single
            {"type": "single", "text": "What is your primary objective for attending medical device trade exhibitions?", "required": True,
             "choices": ["Equipment Procurement & Vendor Bidding", "Hands-on Clinical Trials & Demos", "CME Accredited Workshops", "Peer Research Networking"]},
            # 3. multiple
            {"type": "multiple", "text": "Which medical equipment domains represent your hospital's investment priorities for 2026-2027?", "required": True,
             "choices": ["Surgical Robotics & Minimally Invasive Systems", "AI-assisted Diagnostic Imaging", "ICU Telemetry & Patient Monitoring", "Endoscopy & Laparoscopy Tools", "Sterilization & Infection Control"]},
            # 4. number
            {"type": "number", "text": "Estimated hospital procurement budget bracket for medical technologies (1 to 10 scale representing $100k-$10M)?", "required": True,
             "num_range": (3, 9)},
            # 5. boolean
            {"type": "boolean", "text": "Does your department currently mandate ISO 13485 and FDA/CE compliance verification on-site prior to tenders?", "required": True},
            # 6. date
            {"type": "date", "text": "What is the expected target launch date for your upcoming capital equipment tender?", "required": True,
             "date_range": ("2026-08-01", "2026-12-15")},
            # 7. single
            {"type": "single", "text": "What format of device demonstration is most persuasive for clinical review boards?", "required": True,
             "choices": ["Live Wet-Lab Surgical Simulator", "Sterile Operating Theater Mock-up", "Interactive Digital Twin Simulation", "Technical Whitepaper & Case Studies"]},
            # 8. multiple
            {"type": "multiple", "text": "Which regional accreditations and hospital standards must exhibiting vendors support?", "required": True,
             "choices": ["JCI (Joint Commission International)", "NABH Healthcare Standards", "CE Class III Medical Device", "HIPAA Data Compliance"]},
            # 9. number
            {"type": "number", "text": "On a scale of 1-10, how critical are live OEM technical support teams at the exhibition booth?", "required": True,
             "num_range": (8, 10)},
            # 10. text
            {"type": "text", "text": "What is the single biggest barrier your institution faces when integrating new biomedical hardware?", "required": True,
             "sample_answers": ["EHR and HL7 interoperability", "Clinical staff training overhead", "Capital budget approval cycles", "Ongoing maintenance and spare parts availability"]},
            # 11. boolean
            {"type": "boolean", "text": "Are you interested in participating in exclusive pre-exhibition VIP buyer-seller match meetings?", "required": True},
            # 12. date
            {"type": "date", "text": "When does your institution's annual fiscal budgeting cycle commence?", "required": True,
             "date_range": ("2026-04-01", "2026-07-01")},
            # 13. single
            {"type": "single", "text": "What is your preferred exhibition duration for comprehensive product assessment?", "required": True,
             "choices": ["2 Intensive Days", "3 Full Conference Days", "4 Days with Weekend Consumer Expo"]},
            # 14. number
            {"type": "number", "text": "How would you rate the ease of scheduling clinical equipment trials through trade events (1-10)?", "required": True,
             "num_range": (5, 9)},
            # 15. boolean
            {"type": "boolean", "text": "Would your department head consider presenting a keynote clinical study at this exhibition?", "required": True},
        ]
    },
    {
        "title": "Global Executive Leadership Retreat: Pre-Event Preferences",
        "description": "Pre-summit intelligence gathering to tailor executive roundtable topics, fireside keynote dialogues, confidential break-out discussions, and private travel itineraries.",
        "visibility": "public",
        "duplicate_rule": "allow_multiple",
        "questions": [
            # 1. text
            {"type": "text", "text": "What executive role do you hold within your enterprise?", "required": True,
             "sample_answers": ["Chief Executive Officer", "Chief Operating Officer", "Chief Technology Officer", "Chief Financial Officer", "Managing Partner", "Senior Vice President", "Executive Board Director"]},
            # 2. single
            {"type": "single", "text": "What is your organization's annual revenue bracket?", "required": True,
             "choices": ["$10M - $50M", "$50M - $250M", "$250M - $1B", "Above $1B Enterprise"]},
            # 3. multiple
            {"type": "multiple", "text": "Which strategic governance themes are of highest priority for your executive agenda?", "required": True,
             "choices": ["Geopolitical Risk & Supply Chain Resilience", "Generative AI Governance & Enterprise Automation", "Capital Allocation & M&A Strategy", "Talent Retention & Hybrid Workforce Culture", "ESG & Decarbonization Milestones"]},
            # 4. number
            {"type": "number", "text": "Rate the importance of Chatham House Rule confidentiality for the closed-door roundtables (1-10).", "required": True,
             "num_range": (9, 10)},
            # 5. boolean
            {"type": "boolean", "text": "Will you require private executive airport transfers and secure hotel motorcade arrangements?", "required": True},
            # 6. date
            {"type": "date", "text": "What is your confirmed arrival date at the retreat destination?", "required": True,
             "date_range": ("2026-10-01", "2026-10-03")},
            # 7. single
            {"type": "single", "text": "What discussion structure facilitates the highest leadership engagement for you?", "required": True,
             "choices": ["Moderated 8-Person Peer Roundtables", "Chatham House Fireside Chats", "Private Bilateral Meetings", "Keynote Provocations with Open Q&A"]},
            # 8. multiple
            {"type": "multiple", "text": "Which executive networking and wellness activities would you like to reserve?", "required": True,
             "choices": ["Sunrise Mindful Meditation & Yoga", "Private Golf Scramble", "Helicopter Valley Tour", "Exclusive Vineyard Dinner & Wine Pairing", "Spa & Recovery Sessions"]},
            # 9. number
            {"type": "number", "text": "How many hours per day do you prefer to keep open for personal executive business communication (1-10)?", "required": True,
             "num_range": (2, 5)},
            # 10. text
            {"type": "text", "text": "What is the primary strategic challenge you hope to pressure-test with global peers during the retreat?", "required": True,
             "sample_answers": ["Navigating cross-border regulatory fragmentation", "Accelerating cloud modernization while cutting debt", "Structuring enterprise AI investments with measurable ROI", "Succession planning for executive committee"]},
            # 11. boolean
            {"type": "boolean", "text": "Will a spouse or executive companion be accompanying you for the evening receptions?", "required": True},
            # 12. date
            {"type": "date", "text": "On which date do you plan to conclude your retreat and depart?", "required": True,
             "date_range": ("2026-10-05", "2026-10-07")},
            # 13. single
            {"type": "single", "text": "What preferred accommodation tier do you require for the resort suite?", "required": True,
             "choices": ["Presidential Villa", "Executive Ocean Suite", "Private Mountain Chalet"]},
            # 14. number
            {"type": "number", "text": "Rate the effectiveness of peer advisory masterminds in your past leadership tenure (1-10).", "required": True,
             "num_range": (7, 10)},
            # 15. boolean
            {"type": "boolean", "text": "Do you consent to having your executive profile featured in the confidential retreat participant directory?", "required": True},
        ]
    },
    {
        "title": "Sustainability & Green Operations Survey for Large-Scale Festivals",
        "description": "Public and vendor environmental assessment covering zero single-use plastics, solar/battery stage power, public transit shuttles, and waste diversion metrics.",
        "visibility": "public",
        "duplicate_rule": "allow_multiple",
        "questions": [
            # 1. text
            {"type": "text", "text": "What city or region did you travel from to attend the festival?", "required": True,
             "sample_answers": ["Bengaluru, India", "Mumbai, India", "Austin, Texas", "Berlin, Germany", "London, UK", "Amsterdam, Netherlands", "Melbourne, Australia", "Singapore"]},
            # 2. single
            {"type": "single", "text": "What was your primary mode of transportation to the festival site?", "required": True,
             "choices": ["Electric Shuttle Bus", "Public Rail / Metro", "Carpool / Rideshare", "Bicycle / Active Mobility", "Personal Vehicle"]},
            # 3. multiple
            {"type": "multiple", "text": "Which environmental initiatives did you actively utilize on the festival grounds?", "required": True,
             "choices": ["Reusable Cup Deposit Scheme", "Free Filtered Hydration Refill Stations", "Organic Waste & Composting Bins", "Solar-Powered Device Charging Stations", "Digital-Only Wristband Payments"]},
            # 4. number
            {"type": "number", "text": "How visible and accessible were the waste segregation and recycling stations (1-10)?", "required": True,
             "num_range": (7, 10)},
            # 5. boolean
            {"type": "boolean", "text": "Did you bring your own reusable water bottle or hydration flask to the festival?", "required": True},
            # 6. date
            {"type": "date", "text": "What date did you first enter the festival gates?", "required": True,
             "date_range": ("2026-07-20", "2026-07-23")},
            # 7. single
            {"type": "single", "text": "How would you rate the effectiveness of the zero single-use plastics mandate across all food vendors?", "required": True,
             "choices": ["100% Plastic-Free and Seamless", "Mostly Compliant with Few Exceptions", "Inconvenient Vendor Packaging", "Not Noticeable"]},
            # 8. multiple
            {"type": "multiple", "text": "Which clean energy and eco-conscious festival features impressed you most?", "required": True,
             "choices": ["Hybrid Hydrogen-Solar Stage Generators", "Kinetic Dancefloor Energy Harvesting", "LED Smart Lighting Grids", "Biodegradable Food Utensils"]},
            # 9. number
            {"type": "number", "text": "How likely are you to choose festivals that prioritize net-zero sustainability over conventional events (1-10)?", "required": True,
             "num_range": (8, 10)},
            # 10. text
            {"type": "text", "text": "What one eco-friendly improvement would make the biggest environmental impact for next year's edition?", "required": True,
             "sample_answers": ["More direct express shuttle buses from train stations", "Add compostable toilet options", "Provide washing stations for personal containers", "Mandate all food vendors offer 50%+ plant-based items"]},
            # 11. boolean
            {"type": "boolean", "text": "Would you pay a small voluntary carbon-offset green fee ($2-$5) added to your ticket price?", "required": True},
            # 12. date
            {"type": "date", "text": "When do you typically start booking your summer festival passes and travel?", "required": True,
             "date_range": ("2026-01-15", "2026-04-30")},
            # 13. single
            {"type": "single", "text": "How would you rate the taste, affordability, and variety of plant-based food vendors on site?", "required": True,
             "choices": ["Outstanding Selection & Delicious", "Good Variety at Reasonable Prices", "Limited Options", "Overpriced"]},
            # 14. number
            {"type": "number", "text": "Overall rating of the festival's environmental cleanliness and litter management (1-10)?", "required": True,
             "num_range": (8, 10)},
            # 15. boolean
            {"type": "boolean", "text": "Would you like to participate in next year's volunteer Green Ambassador cleanup crew?", "required": True},
        ]
    }
]

def generate_random_date(start_str: str, end_str: str) -> str:
    start_dt = datetime.strptime(start_str, "%Y-%m-%d")
    end_dt = datetime.strptime(end_str, "%Y-%m-%d")
    delta_days = (end_dt - start_dt).days
    random_days = random.randint(0, max(0, delta_days))
    chosen_dt = start_dt + timedelta(days=random_days)
    return chosen_dt.strftime("%Y-%m-%d")

def generate_random_ip() -> str:
    subnets = ["192.168", "10.0", "172.16", "49.207", "103.21"]
    return f"{random.choice(subnets)}.{random.randint(1, 254)}.{random.randint(1, 254)}"

def run():
    print("=" * 70)
    print("EVENT MANAGER — SYNTHETIC SURVEY & ANALYTICS DATA SEEDER")
    print("=" * 70)

    # 1. Resolve Creator User & Projects
    creator_user = User.objects.filter(is_superuser=True).first() or User.objects.first()
    if not creator_user:
        print("Creating initial system user...")
        creator_user = User.objects.create_user(
            username="system_admin",
            email="admin@eventmanager.com",
            first_name="System",
            last_name="Admin"
        )
    print(f"Using Creator User: {creator_user.username} ({creator_user.email})")

    projects = list(EventProject.objects.all())
    if not projects:
        print("No event project found, creating fallback project...")
        fallback_proj = EventProject.objects.create(
            project_name="Global Showcase Initiative 2026",
            owner=creator_user,
            event_category="Conferences & Summits",
            event_country="United States",
            event_city="San Francisco",
            status="created"
        )
        projects = [fallback_proj]
    print(f"Loaded {len(projects)} Event Projects for survey association.")

    # Get or create free pricing option
    free_plan = SurveyPricingOption.objects.filter(is_free=True).first()
    if not free_plan:
        free_plan = SurveyPricingOption.objects.create(
            name="Standard Plan",
            code="standard-free",
            price=0.00,
            currency="INR",
            is_free=True,
            is_active=True
        )

    # Prepare user pool for authenticated responses
    all_users = list(User.objects.all()[:20])

    surveys_created = 0
    questions_created = 0
    responses_created = 0
    answers_created = 0

    with transaction.atomic():
        for s_idx, tmpl in enumerate(SURVEY_TEMPLATES):
            assigned_project = projects[s_idx % len(projects)]
            print(f"\n[{s_idx + 1}/5] Creating Survey: '{tmpl['title']}'...")

            survey = Survey.objects.create(
                project=assigned_project,
                title=tmpl["title"],
                description=tmpl["description"],
                created_by=creator_user,
                status=Survey.Status.PUBLISHED,
                visibility=Survey.Visibility.PUBLIC,
                allow_anonymous=True,
                duplicate_rule=Survey.DuplicateRule.ALLOW_MULTIPLE,
                is_paid=True,
                pricing_option=free_plan,
                start_date=timezone.now() - timedelta(days=14),
                end_date=timezone.now() + timedelta(days=60),
            )
            surveys_created += 1

            # Create Questions & Choices
            q_instances = []
            q_choices_map = {}  # question_idx -> list of QuestionChoice instances

            for q_order, q_def in enumerate(tmpl["questions"]):
                q_inst = Question.objects.create(
                    survey=survey,
                    text=q_def["text"],
                    question_type=q_def["type"],
                    is_required=q_def.get("required", True),
                    order=q_order,
                )
                questions_created += 1
                q_instances.append((q_inst, q_def))

                # If choice type, create choices
                if q_def["type"] in ["single", "multiple"] and "choices" in q_def:
                    choices_to_create = [
                        QuestionChoice(question=q_inst, text=c_text, order=c_idx)
                        for c_idx, c_text in enumerate(q_def["choices"])
                    ]
                    created_choices = QuestionChoice.objects.bulk_create(choices_to_create)
                    q_choices_map[q_order] = created_choices

            print(f"  -> Created {len(q_instances)} questions with choices across all 6 question types.")

            # Create at least 52 responses per survey
            num_responses = 52
            response_instances = []
            for r_i in range(num_responses):
                # Mix of authenticated and anonymous users
                respondent_user = random.choice(all_users) if (r_i % 3 == 0 and all_users) else None
                sub_time = timezone.now() - timedelta(
                    days=random.randint(0, 10),
                    hours=random.randint(0, 23),
                    minutes=random.randint(0, 59)
                )

                resp = SurveyResponse(
                    survey=survey,
                    user=respondent_user,
                    respondent_ip=generate_random_ip(),
                    respondent_session=f"sess_{uuid.uuid4().hex[:16]}",
                )
                response_instances.append((resp, sub_time))

            # Bulk save responses
            saved_responses = SurveyResponse.objects.bulk_create([r[0] for r in response_instances])
            responses_created += len(saved_responses)

            # Assign submitted_at timestamps
            for saved_resp, (_, sub_time) in zip(saved_responses, response_instances):
                saved_resp.submitted_at = sub_time
            SurveyResponse.objects.bulk_update(saved_responses, ["submitted_at"])

            # Create Answers (15 per response = 52 * 15 = 780 answers per survey)
            answers_to_create = []

            for resp in saved_responses:
                for q_order, (q_inst, q_def) in enumerate(q_instances):
                    q_type = q_def["type"]
                    ans_val = None

                    if q_type == "text":
                        samples = q_def.get("sample_answers", ["Detailed feedback response."])
                        ans_val = random.choice(samples)

                    elif q_type == "number":
                        min_v, max_v = q_def.get("num_range", (1, 10))
                        ans_val = random.randint(min_v, max_v)

                    elif q_type == "boolean":
                        # Skew positively for realistic customer satisfaction
                        ans_val = random.choices([True, False], weights=[0.82, 0.18])[0]

                    elif q_type == "date":
                        start_d, end_d = q_def.get("date_range", ("2026-05-01", "2026-08-30"))
                        ans_val = generate_random_date(start_d, end_d)

                    elif q_type == "single":
                        choices = q_choices_map.get(q_order, [])
                        if choices:
                            chosen_choice = random.choice(choices)
                            # Backend API accepts choice UUID or text
                            ans_val = str(chosen_choice.id)
                        else:
                            ans_val = "Option A"

                    elif q_type == "multiple":
                        choices = q_choices_map.get(q_order, [])
                        if choices:
                            # Pick 1 to 3 distinct choices
                            pick_count = min(len(choices), random.randint(1, 3))
                            chosen_choices = random.sample(choices, pick_count)
                            ans_val = [str(c.id) for c in chosen_choices]
                        else:
                            ans_val = ["Choice 1"]

                    answers_to_create.append(
                        Answer(
                            response=resp,
                            question=q_inst,
                            value=ans_val
                        )
                    )

            # Bulk create answers in chunks of 500 for optimal Postgres performance
            Answer.objects.bulk_create(answers_to_create, batch_size=500)
            answers_created += len(answers_to_create)
            print(f"  -> Generated {len(saved_responses)} responses & {len(answers_to_create)} answers.")

    print("\n" + "=" * 70)
    print("SEEDING SUMMARY:")
    print(f"  Surveys Created:    {surveys_created}  (Target: 5)")
    print(f"  Questions Created:  {questions_created}  (Target: 75, exactly 15 per survey)")
    print(f"  Responses Created:  {responses_created}  (Target: >= 250, exactly 52 per survey)")
    print(f"  Answers Created:    {answers_created}  (Target: >= 3,750, exactly 15 per response)")
    print("=" * 70)
    print("SUCCESS: Database fully populated with realistic synthetic survey data!")

if __name__ == "__main__":
    run()
