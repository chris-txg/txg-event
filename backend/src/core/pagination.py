import math
from typing import Any
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsSetPagination(PageNumberPagination):
    """
    Enterprise-grade pagination providing frontend-friendly metadata:
    - count: total item count matching the query
    - total_pages: computed total pages
    - current_page: current active page number
    - page_size: current items per page
    - next: link to next page (or null)
    - previous: link to previous page (or null)
    - results: item payload array

    Supports client-controlled page_size bounded by max_page_size.
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
    page_query_param = "page"

    def get_paginated_response(self, data: Any) -> Response:
        page_size = self.get_page_size(self.request) or self.page_size
        count = self.page.paginator.count
        total_pages = math.ceil(count / page_size) if page_size > 0 else 1

        return Response(
            {
                "count": count,
                "total_pages": total_pages,
                "current_page": self.page.number,
                "page_size": page_size,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "results": data,
            }
        )

    def get_paginated_response_schema(self, schema: dict[str, Any]) -> dict[str, Any]:
        """
        OpenAPI 3.0 schema generation for drf-spectacular.
        """
        return {
            "type": "object",
            "properties": {
                "count": {
                    "type": "integer",
                    "example": 120,
                    "description": "Total number of records matching query.",
                },
                "total_pages": {
                    "type": "integer",
                    "example": 6,
                    "description": "Total number of pages available.",
                },
                "current_page": {
                    "type": "integer",
                    "example": 1,
                    "description": "Current active page number.",
                },
                "page_size": {
                    "type": "integer",
                    "example": 20,
                    "description": "Number of items returned per page.",
                },
                "next": {
                    "type": "string",
                    "nullable": True,
                    "format": "uri",
                    "example": "http://api.example.com/items/?page=2",
                },
                "previous": {
                    "type": "string",
                    "nullable": True,
                    "format": "uri",
                    "example": "http://api.example.com/items/?page=1",
                },
                "results": schema,
            },
            "required": ["count", "total_pages", "current_page", "page_size", "results"],
        }

