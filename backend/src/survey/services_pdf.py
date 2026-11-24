import io
from datetime import datetime
from collections import Counter
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)
from reportlab.graphics.shapes import Drawing, Rect, String as DString, Group
from reportlab.graphics.charts.piecharts import Pie


# Palette matching analytics UI
PALETTE = [
    colors.HexColor("#762D46"),  # Maroon
    colors.HexColor("#A84A63"),  # Rose
    colors.HexColor("#D48B9D"),  # Soft rose
    colors.HexColor("#EED7DF"),  # Light tint
    colors.HexColor("#542037"),  # Deep maroon
    colors.HexColor("#9E3C57"),  # Medium berry
]


def create_donut_chart_drawing(distribution: list) -> Drawing:
    """
    Renders a donut pie chart with legend for single/boolean questions (<= 4 choices).
    """
    d = Drawing(520, 110)
    data = [float(item.get("count", 0)) for item in distribution if item.get("count", 0) > 0]
    if not data or sum(data) == 0:
        return d

    pc = Pie()
    pc.x = 20
    pc.y = 5
    pc.width = 100
    pc.height = 100
    pc.data = data
    pc.sideLabels = False

    for i in range(len(data)):
        pc.slices[i].fillColor = PALETTE[i % len(PALETTE)]
        pc.slices[i].strokeColor = colors.white
        pc.slices[i].strokeWidth = 1.5

    d.add(pc)

    # Donut center circle for donut look
    inner_circle = Drawing(100, 100)
    from reportlab.graphics.shapes import Circle
    center_hole = Circle(70, 55, 26, fillColor=colors.white, strokeColor=colors.white)
    d.add(center_hole)

    # Legend on right side
    legend_x = 150
    legend_y = 90
    for idx, item in enumerate(distribution):
        opt = str(item.get("option", ""))
        cnt = item.get("count", 0)
        pct = round(float(item.get("percentage", 0)))
        swatch_color = PALETTE[idx % len(PALETTE)]

        # Color swatch
        d.add(Rect(legend_x, legend_y - 2, 8, 8, fillColor=swatch_color, strokeColor=None))
        # Label & percentage
        label_text = f"{opt[:35]} ({pct}% - {cnt} responses)"
        d.add(DString(legend_x + 14, legend_y, label_text, fontName="Helvetica", fontSize=8.5, fillColor=colors.HexColor("#30232A")))
        legend_y -= 18
        if legend_y < 10:
            break

    return d


def create_horizontal_bars_drawing(distribution: list) -> Drawing:
    """
    Renders horizontal percentage bar charts for multiple or >4 choice questions.
    """
    bar_height = 12
    gap = 20
    drawing_height = max(50, len(distribution) * gap + 15)
    d = Drawing(520, drawing_height)

    current_y = drawing_height - 18
    max_bar_width = 320

    for idx, item in enumerate(distribution):
        opt = str(item.get("option", ""))
        pct = float(item.get("percentage", 0))
        cnt = item.get("count", 0)
        bar_w = max(2, (pct / 100.0) * max_bar_width)

        # Label above bar
        label_str = f"{opt[:45]} ({round(pct)}% - {cnt} responses)"
        d.add(DString(10, current_y + 4, label_str, fontName="Helvetica-Bold", fontSize=8, fillColor=colors.HexColor("#30232A")))

        # Bar background track
        d.add(Rect(10, current_y - 8, max_bar_width, 8, fillColor=colors.HexColor("#F0E6EA"), strokeColor=None, rx=4, ry=4))
        # Active progress bar
        bar_color = PALETTE[idx % len(PALETTE)]
        d.add(Rect(10, current_y - 8, bar_w, 8, fillColor=bar_color, strokeColor=None, rx=4, ry=4))

        current_y -= gap

    return d


def create_timeline_drawing(daily_counts: list) -> Drawing:
    """
    Renders the Daily Responses Timeline bar chart matching the Analytics UI.
    """
    d = Drawing(520, 100)
    if not daily_counts:
        return d

    # daily_counts is sorted list of (date_str, count)
    max_count = max([c for _, c in daily_counts], default=1)
    bar_width = min(28, int(420 / max(1, len(daily_counts))))
    max_bar_height = 60
    start_x = 25
    base_y = 22

    # Draw timeline title/header inside drawing
    d.add(DString(10, 85, "Daily Responses Timeline", fontName="Helvetica-Bold", fontSize=9, fillColor=colors.HexColor("#30232A")))

    # Baseline
    d.add(Rect(10, base_y, 480, 0.5, fillColor=colors.HexColor("#E9DDE1"), strokeColor=None))

    for idx, (dt_str, count) in enumerate(daily_counts):
        x = start_x + idx * (bar_width + 12)
        h = max(3, int((count / max_count) * max_bar_height))
        y = base_y + 1

        # Bar
        d.add(Rect(x, y, bar_width, h, fillColor=colors.HexColor("#762D46"), strokeColor=None, rx=2, ry=2))
        # Value on top
        d.add(DString(x + (bar_width / 2) - 3, y + h + 3, str(count), fontName="Helvetica-Bold", fontSize=7, fillColor=colors.HexColor("#762D46")))
        # Date label below
        d.add(DString(x - 2, base_y - 12, dt_str, fontName="Helvetica", fontSize=7, fillColor=colors.HexColor("#75666D")))

    return d


def generate_executive_report_pdf(survey, analytics: dict, text_answers: list = None) -> bytes:
    """
    Generates an executive PDF report for a survey with full analytics graphs,
    KPIs, question distributions, numeric summaries, daily timeline, and research insights.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    primary_color = colors.HexColor("#542037")
    accent_color = colors.HexColor("#762D46")
    bg_light = colors.HexColor("#FAF6F7")
    text_dark = colors.HexColor("#30232A")
    text_muted = colors.HexColor("#75666D")
    border_color = colors.HexColor("#E9DDE1")

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=primary_color,
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "DocSubTitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13,
        textColor=text_muted,
        spaceAfter=10,
    )
    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=primary_color,
        spaceBefore=12,
        spaceAfter=6,
    )
    kpi_num_style = ParagraphStyle(
        "KpiNum",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=primary_color,
        alignment=1,
    )
    kpi_label_style = ParagraphStyle(
        "KpiLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=text_muted,
        alignment=1,
    )
    body_bold = ParagraphStyle(
        "BodyBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=text_dark,
    )
    body_text = ParagraphStyle(
        "BodyTextCustom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11.5,
        textColor=text_dark,
    )

    story = []

    # 1. Header Banner Table
    header_data = [
        [
            Paragraph(f"<b>OFFICIAL EXECUTIVE REPORT</b> &nbsp;|&nbsp; <font color='#059669'>{survey.status.upper()}</font>", subtitle_style),
            Paragraph(f"<b>Generated:</b> {datetime.now().strftime('%b %d, %Y')}", subtitle_style),
        ],
        [
            Paragraph(survey.title, title_style),
            Paragraph(f"<b>Project:</b> {survey.project.project_name if survey.project else 'Standalone'}", body_bold),
        ],
        [
            Paragraph(survey.description or "Audience intelligence and question analysis report.", subtitle_style),
            "",
        ],
    ]
    t_header = Table(header_data, colWidths=[380, 160])
    t_header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.append(t_header)
    story.append(HRFlowable(width="100%", thickness=1, color=border_color, spaceBefore=4, spaceAfter=8))

    # 2. KPI Cards
    total_responses = analytics.get("total_responses", 0)
    questions_list = analytics.get("questions", [])
    total_questions = len(questions_list) or (survey.questions.count() if hasattr(survey, 'questions') else 0)

    kpi_data = [
        [
            Paragraph("TOTAL RESPONSES", kpi_label_style),
            Paragraph("QUESTIONS CONFIGURED", kpi_label_style),
            Paragraph("COMPLETION RATE", kpi_label_style),
            Paragraph("SURVEY VISIBILITY", kpi_label_style),
        ],
        [
            Paragraph(str(total_responses), kpi_num_style),
            Paragraph(str(total_questions), kpi_num_style),
            Paragraph("100%" if total_responses > 0 else "0%", kpi_num_style),
            Paragraph(survey.visibility.upper(), kpi_num_style),
        ],
    ]
    t_kpis = Table(kpi_data, colWidths=[135, 135, 135, 135])
    t_kpis.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg_light),
        ("BOX", (0, 0), (-1, -1), 1, border_color),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, border_color),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(t_kpis)
    story.append(Spacer(1, 10))

    # 3. Question Statistics & Visual Graphs
    story.append(Paragraph("Question Analytics & Response Distributions", section_heading))
    story.append(HRFlowable(width="100%", thickness=0.5, color=border_color, spaceBefore=2, spaceAfter=8))

    for idx, q_stat in enumerate(questions_list, 1):
        # Fix: Access 'text' key (fallback to 'question_text') to prevent "None"
        q_text = q_stat.get("text") or q_stat.get("question_text") or f"Question {idx}"
        q_type = q_stat.get("question_type", "single")
        answered_count = q_stat.get("answered_count", 0)
        distribution = q_stat.get("distribution", [])
        summary = q_stat.get("summary")
        recent_samples = q_stat.get("recent_samples", [])

        q_flowables = []
        q_header = Paragraph(f"<b>Q{idx}: {q_text}</b> &nbsp;<font color='#75666D'>({answered_count} responses)</font>", body_bold)
        q_flowables.append(q_header)
        q_flowables.append(Spacer(1, 4))

        if distribution:
            # Graphical Visual: Donut chart for <= 4 choices (single/boolean), Horizontal Bar for > 4 choices or multiple
            if (q_type in ("single", "boolean") or len(distribution) <= 4) and len(distribution) <= 4:
                donut_drawing = create_donut_chart_drawing(distribution)
                q_flowables.append(donut_drawing)
            else:
                bars_drawing = create_horizontal_bars_drawing(distribution)
                q_flowables.append(bars_drawing)

        elif summary:
            # Numeric questions summary card
            s_avg = summary.get("avg", 0)
            s_min = summary.get("min", 0)
            s_max = summary.get("max", 0)
            num_data = [
                ["Average Rating", "Minimum Value", "Maximum Value"],
                [str(s_avg), str(s_min), str(s_max)],
            ]
            t_num = Table(num_data, colWidths=[180, 170, 170])
            t_num.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F4ECF0")),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#F0E6EA")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            q_flowables.append(t_num)

        elif recent_samples:
            # Qualitative text answers
            sample_paragraphs = [
                Paragraph(f"• \"{s}\"", body_text)
                for s in recent_samples[:6]
            ]
            q_flowables.extend(sample_paragraphs)

        q_flowables.append(Spacer(1, 8))
        story.append(KeepTogether(q_flowables))

    # 4. Daily Responses Timeline Chart
    if hasattr(survey, 'responses'):
        dates_list = list(survey.responses.values_list('submitted_at__date', flat=True))
        if dates_list:
            c = Counter([d.strftime('%b %d') for d in dates_list if d])
            sorted_dates = sorted(c.items(), key=lambda x: datetime.strptime(f"{x[0]} 2026", "%b %d %Y") if x[0] else datetime.min)[-10:]
            if sorted_dates:
                story.append(Spacer(1, 6))
                timeline_drawing = create_timeline_drawing(sorted_dates)
                story.append(KeepTogether([timeline_drawing, Spacer(1, 10)]))

    # 5. Key Research Insights & Summary Observations (No "None", No "Antigravity" branding)
    obs_flowables = [
        Spacer(1, 6),
        Paragraph("Key Research Insights & Summary Observations", section_heading),
        HRFlowable(width="100%", thickness=0.5, color=border_color, spaceBefore=2, spaceAfter=8),
        Paragraph(f"• Recorded {total_responses} valid attendee submission(s) across {total_questions} question fields.", body_text),
    ]

    for q in questions_list:
        dist = q.get("distribution", [])
        q_title = q.get("text") or q.get("question_text") or "Question"
        if dist:
            top_choice = max(dist, key=lambda x: x.get("count", 0))
            if top_choice.get("count", 0) > 0:
                obs_flowables.append(
                    Paragraph(f"• For <b>\"{q_title}\"</b>: \"{top_choice.get('option')}\" is the leading response with {round(float(top_choice.get('percentage', 0)))}% ({top_choice.get('count')} responses).", body_text)
                )

    obs_flowables.append(Spacer(1, 14))
    obs_flowables.append(Paragraph("<font color='#75666D'>Official Survey Intelligence Report</font>", subtitle_style))
    story.append(KeepTogether(obs_flowables))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
