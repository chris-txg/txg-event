import io
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from django.db import transaction
from rest_framework.exceptions import ValidationError
from survey.models import Survey, Question, QuestionChoice


SUPPORTED_TYPES = [
    ("text", "Text (Open feedback/short answer)"),
    ("number", "Number (Numeric rating, age, or quantity)"),
    ("single", "Single Choice (Select one option)"),
    ("multiple", "Multiple Choice (Select multiple options)"),
    ("boolean", "Yes/No (Boolean prompt)"),
    ("date", "Date (Calendar date input)"),
]

TYPE_CHOICES = ["text", "number", "single", "multiple", "boolean", "date"]


def generate_question_excel_template() -> bytes:
    """
    Generates a beautifully formatted Excel template (.xlsx) for bulk question authoring.
    Sheet 1 is 'Instructions & Reference' with step-by-step guidance on entering questions on Sheet 2.
    Sheet 2 is 'Survey Questions' (clean, spacious, 250%-300% enlarged cells, without dummy rows)
    with data validation dropdowns for question types and required flags.
    """
    wb = Workbook()

    # Shared palette
    header_fill = PatternFill(start_color="542037", end_color="542037", fill_type="solid")
    header_font = Font(name="Calibri", size=12, bold=True, color="FFFFFF")
    accent_fill = PatternFill(start_color="FAF0F4", end_color="FAF0F4", fill_type="solid")
    accent_font = Font(name="Calibri", size=11, bold=True, color="542037")
    regular_font = Font(name="Calibri", size=11, color="30232A")
    border_thin = Side(border_style="thin", color="E9DDE1")
    cell_border = Border(top=border_thin, left=border_thin, right=border_thin, bottom=border_thin)

    # -------------------------------------------------------------
    # Sheet 1: Instructions & Reference (First Sheet Opened)
    # -------------------------------------------------------------
    ws_guide = wb.active
    ws_guide.title = "Instructions & Reference"
    ws_guide.column_dimensions["A"].width = 45
    ws_guide.column_dimensions["B"].width = 110
    ws_guide.column_dimensions["C"].width = 100

    # Banner title
    ws_guide.merge_cells("A1:C1")
    title_cell = ws_guide["A1"]
    title_cell.value = "HOW TO BULK IMPORT SURVEY QUESTIONS"
    title_cell.fill = header_fill
    title_cell.font = Font(name="Calibri", size=14, bold=True, color="FFFFFF")
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws_guide.row_dimensions[1].height = 55

    # Step-by-step instructions
    steps = [
        ("STEP 1: REVIEW QUESTION TYPES", "Check the reference table below for supported question codes and rules.", "Read the options rules"),
        ("STEP 2: CLICK THE SECOND SHEET", "CLICK THE 2ND SHEET TAB ('Survey Questions') AT THE BOTTOM OF EXCEL TO ENTER YOUR QUESTIONS.", "Leave Sheet 1 as reference"),
        ("STEP 3: SAVE AND UPLOAD", "Once you enter your questions, save this file (.xlsx) and upload it in the 'Import from Excel' modal.", "Instant validation preview"),
    ]

    for s_idx, (s_title, s_desc, s_note) in enumerate(steps, start=2):
        ws_guide.cell(row=s_idx, column=1, value=s_title).font = accent_font
        ws_guide.cell(row=s_idx, column=1).fill = accent_fill
        ws_guide.cell(row=s_idx, column=1).alignment = Alignment(vertical="center", indent=1)
        ws_guide.cell(row=s_idx, column=1).border = cell_border

        ws_guide.cell(row=s_idx, column=2, value=s_desc).font = Font(name="Calibri", size=11, bold=(s_idx == 3), color="30232A")
        if s_idx == 3:
            ws_guide.cell(row=s_idx, column=2).fill = accent_fill
        ws_guide.cell(row=s_idx, column=2).alignment = Alignment(vertical="center", wrap_text=True)
        ws_guide.cell(row=s_idx, column=2).border = cell_border

        ws_guide.cell(row=s_idx, column=3, value=s_note).font = regular_font
        ws_guide.cell(row=s_idx, column=3).alignment = Alignment(vertical="center", wrap_text=True)
        ws_guide.cell(row=s_idx, column=3).border = cell_border

        ws_guide.row_dimensions[s_idx].height = 45

    # Spacer row
    ws_guide.row_dimensions[5].height = 20

    # Guide table headers
    guide_headers = ["Question Type Code", "Description", "Rules for Options / Choices"]
    for col_num, h_text in enumerate(guide_headers, start=1):
        cell = ws_guide.cell(row=6, column=col_num, value=h_text)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = cell_border
    ws_guide.row_dimensions[6].height = 55

    guide_data = [
        ["single", "Single choice question (attendee selects one option)", "MANDATORY: Provide at least 2 choices separated by commas (e.g. Metro, Bus, Car)"],
        ["multiple", "Multiple choice question (attendee selects one or more options)", "MANDATORY: Provide at least 2 choices separated by commas"],
        ["number", "Numeric input or rating scale", "OPTIONAL RATING: Enter range like '1-10' or '1 to 5' to constrain as a rating scale. Leave empty for open number."],
        ["boolean", "Yes / No question prompt", "LEAVE EMPTY: The system automatically generates Yes and No choices"],
        ["text", "Open text response (short answer or paragraph feedback)", "LEAVE EMPTY: Text questions do not take options"],
        ["date", "Calendar date selector", "LEAVE EMPTY: Date questions do not take options"],
    ]

    for row_idx, r in enumerate(guide_data, start=7):
        for c_idx, val in enumerate(r, start=1):
            cell = ws_guide.cell(row=row_idx, column=c_idx, value=val)
            cell.border = cell_border
            cell.font = regular_font
            cell.alignment = Alignment(vertical="center", wrap_text=True)
        ws_guide.row_dimensions[row_idx].height = 55

    # -------------------------------------------------------------
    # Sheet 2: Survey Questions (Clean, No Sample Rows)
    # -------------------------------------------------------------
    ws_questions = wb.create_sheet(title="Survey Questions")

    headers = [
        "Question Type",
        "Question Text",
        "Required (Yes/No)",
        "Options / Choices (Comma-separated for Single & Multiple)",
    ]
    ws_questions.append(headers)

    # Style header row (height increased by 250% to 70)
    for col_num in range(1, len(headers) + 1):
        cell = ws_questions.cell(row=1, column=col_num)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = cell_border
    ws_questions.row_dimensions[1].height = 70

    # Pre-configure generous heights and wrap_text across rows 2 to 500 for comfortable typing
    for empty_row_idx in range(2, 501):
        ws_questions.row_dimensions[empty_row_idx].height = 60
        for c in range(1, 5):
            cell = ws_questions.cell(row=empty_row_idx, column=c)
            cell.font = regular_font
            cell.alignment = Alignment(vertical="center", wrap_text=True)

    # Column widths (Increased by 250% - 300% for ultra-spacious editing)
    # A: 20 -> 50 (250%)
    # B: 50 -> 125 (250%)
    # C: 20 -> 45 (225%)
    # D: 65 -> 160 (246%)
    ws_questions.column_dimensions["A"].width = 50
    ws_questions.column_dimensions["B"].width = 125
    ws_questions.column_dimensions["C"].width = 45
    ws_questions.column_dimensions["D"].width = 160

    # Add Dropdown Data Validation for Question Type (Column A)
    type_dv = DataValidation(
        type="list",
        formula1=f'"{",".join(TYPE_CHOICES)}"',
        allow_blank=False,
    )
    type_dv.error = "Your entry is not in the list of supported question types."
    type_dv.errorTitle = "Invalid Question Type"
    type_dv.prompt = "Choose from: text, number, single, multiple, boolean, date"
    type_dv.promptTitle = "Supported Question Type"
    ws_questions.add_data_validation(type_dv)
    type_dv.add("A2:A500")

    # Add Dropdown Data Validation for Required (Column C)
    req_dv = DataValidation(
        type="list",
        formula1='"Yes,No"',
        allow_blank=False,
    )
    req_dv.error = "Must be either 'Yes' or 'No'."
    req_dv.errorTitle = "Invalid Required Flag"
    ws_questions.add_data_validation(req_dv)
    req_dv.add("C2:C500")

    # Set Sheet 1 as the initially active/visible sheet when opening Excel
    wb.active = ws_guide

    output = io.BytesIO()
    wb.save(output)
    content = output.getvalue()
    output.close()
    return content


def parse_and_validate_questions_excel(file_obj, survey: Survey) -> tuple[list, list]:
    """
    Parses an uploaded .xlsx file and strictly validates headers and row values.
    Returns: (validated_questions_list, errors_list)
    If errors_list is non-empty, parsing aborted with detailed row/column issues.
    """
    import openpyxl

    errors = []
    validated_questions = []

    try:
        wb = openpyxl.load_workbook(file_obj, data_only=True)
    except Exception as exc:
        return [], [{"row": 0, "column": "File", "message": f"Could not open file as valid Excel workbook: {str(exc)}"}]

    # Look for 'Survey Questions' sheet or search sheets for question headers
    ws = None
    if "Survey Questions" in wb.sheetnames:
        ws = wb["Survey Questions"]
    else:
        for sheet in wb.worksheets:
            first_cell = str(sheet.cell(1, 1).value or "").strip().lower()
            if first_cell.startswith("question type"):
                ws = sheet
                break
        if ws is None:
            ws = wb.active

    # Check header row
    expected_headers = [
        "question type",
        "question text",
        "required (yes/no)",
        "options / choices (comma-separated for single & multiple)",
    ]

    header_row = [str(cell.value or "").strip().lower() for cell in ws[1][:4]]
    if len(header_row) < 3 or not header_row[0].startswith("question type"):
        errors.append({
            "row": 1,
            "column": "Headers",
            "message": "Invalid template headers. Please ensure questions are entered in the 'Survey Questions' sheet of the official template.",
        })
        return [], errors

    row_count = 0
    for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        # Stop if row is completely empty
        if not any(row):
            continue

        row_count += 1
        q_type_raw = str(row[0] or "").strip().lower()
        q_text_raw = str(row[1] or "").strip()
        required_raw = str(row[2] or "").strip().lower()
        options_raw = str(row[3] or "").strip() if len(row) > 3 else ""

        # Validate Question Type
        if not q_type_raw:
            errors.append({
                "row": row_idx,
                "column": "Question Type (Col A)",
                "message": "Question type is empty.",
            })
            continue

        if q_type_raw not in TYPE_CHOICES:
            errors.append({
                "row": row_idx,
                "column": "Question Type (Col A)",
                "message": f"Invalid question type '{q_type_raw}'. Must be one of: {', '.join(TYPE_CHOICES)}.",
            })

        # Validate Question Text
        if not q_text_raw:
            errors.append({
                "row": row_idx,
                "column": "Question Text (Col B)",
                "message": "Question text cannot be empty.",
            })

        # Validate Required Flag
        is_required = True
        if required_raw in ("yes", "y", "true", "1"):
            is_required = True
        elif required_raw in ("no", "n", "false", "0"):
            is_required = False
        elif not required_raw:
            is_required = True
        else:
            errors.append({
                "row": row_idx,
                "column": "Required (Col C)",
                "message": f"Invalid Required value '{required_raw}'. Must be 'Yes' or 'No'.",
            })

        # Validate Choices for Single / Multiple or Rating Range for Number
        choices_list = []
        is_rating = False
        min_rating = None
        max_rating = None

        if q_type_raw in ("single", "multiple"):
            if not options_raw:
                errors.append({
                    "row": row_idx,
                    "column": "Options (Col D)",
                    "message": f"{q_type_raw.title()} choice question requires choices separated by commas in column D.",
                })
            else:
                raw_split = [c.strip() for c in options_raw.split(",") if c.strip()]
                # Deduplicate choices while preserving order
                seen = set()
                choices_list = [c for c in raw_split if not (c.lower() in seen or seen.add(c.lower()))]
                if len(choices_list) < 2:
                    errors.append({
                        "row": row_idx,
                        "column": "Options (Col D)",
                        "message": f"At least 2 distinct choices are required (found {len(choices_list)}).",
                    })

        elif q_type_raw == "number" and options_raw:
            import re
            m = re.match(r"^\s*(\d+)\s*(?:-|to|,)\s*(\d+)\s*$", options_raw, re.IGNORECASE)
            if m:
                min_r = int(m.group(1))
                max_r = int(m.group(2))
                if min_r < max_r:
                    is_rating = True
                    min_rating = min_r
                    max_rating = max_r
                else:
                    errors.append({
                        "row": row_idx,
                        "column": "Options (Col D)",
                        "message": f"Invalid rating range '{options_raw}'. Minimum ({min_r}) must be less than maximum ({max_r}).",
                    })
            else:
                errors.append({
                    "row": row_idx,
                    "column": "Options (Col D)",
                    "message": f"Invalid rating format '{options_raw}'. Enter a range like '1-10' or '1 to 5', or leave empty for open number.",
                })

        validated_questions.append({
            "order": row_idx - 1,
            "text": q_text_raw,
            "question_type": q_type_raw,
            "is_required": is_required,
            "is_rating": is_rating,
            "min_rating": min_rating,
            "max_rating": max_rating,
            "choices": choices_list,
        })

    if row_count == 0:
        errors.append({
            "row": 0,
            "column": "Survey Questions",
            "message": "No questions were found in the 'Survey Questions' sheet. Please click the 2nd sheet ('Survey Questions') in your Excel file and enter at least one question.",
        })

    return validated_questions, errors


@transaction.atomic
def create_bulk_questions(survey: Survey, validated_questions: list) -> list:
    """
    Atomically creates questions and their associated choices in the database.
    Calculates existing question count to maintain sequential order.
    """
    if not survey.can_edit_structure():
        raise ValidationError("Cannot modify questionnaire structure because responses have already been recorded.")

    current_max_order = survey.questions.count()
    created_questions = []

    for idx, item in enumerate(validated_questions):
        q = Question.objects.create(
            survey=survey,
            text=item["text"],
            question_type=item["question_type"],
            is_required=item["is_required"],
            is_rating=item.get("is_rating", False),
            min_rating=item.get("min_rating"),
            max_rating=item.get("max_rating"),
            order=current_max_order + idx,
        )

        # Create choices if single or multiple
        if item["choices"]:
            choice_objs = [
                QuestionChoice(question=q, text=choice_text, order=c_idx)
                for c_idx, choice_text in enumerate(item["choices"])
            ]
            QuestionChoice.objects.bulk_create(choice_objs)

        created_questions.append(q)

    return created_questions
