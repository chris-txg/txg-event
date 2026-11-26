from django.urls import path

from projects.views import (
    EventProjectDetailView,
    EventProjectDocumentDeleteView,
    EventProjectListCreateView,
    EventProjectSurveysListView,
    EventVendorBudgetSummaryView,
    EventVendorDetailView,
    EventVendorListCreateView,
)

urlpatterns = [
    path("api/projects/", EventProjectListCreateView.as_view(), name="project_list_create"),
    path("api/projects/<uuid:id>/", EventProjectDetailView.as_view(), name="project_detail"),
    path("api/projects/<uuid:id>/surveys/", EventProjectSurveysListView.as_view(), name="project_surveys"),
    path(
        "api/projects/<uuid:id>/documents/<uuid:doc_id>/",
        EventProjectDocumentDeleteView.as_view(),
        name="project_document_delete",
    ),
    # Project Vendors
    path("api/projects/<uuid:id>/vendors/", EventVendorListCreateView.as_view(), name="project_vendors"),
    path(
        "api/projects/<uuid:id>/vendors/<uuid:vendor_assignment_id>/",
        EventVendorDetailView.as_view(),
        name="project_vendor_detail",
    ),
    path(
        "api/projects/<uuid:id>/vendors/budget-summary/",
        EventVendorBudgetSummaryView.as_view(),
        name="project_vendors_budget_summary",
    ),
]

