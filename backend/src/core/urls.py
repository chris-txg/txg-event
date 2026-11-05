"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path

from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("admin/dj-control-room-base/", include("dj_control_room_base.urls")),  # for base
    path("admin/dj-redis-panel/", include("dj_redis_panel.urls")),  # for redis panel
    path("admin/dj-celery-panel/", include("dj_celery_panel.urls")),  # for celery panel
    path("admin/dj-control-room/", include("dj_control_room.urls")),  # for the control room
    path("admin/dj_cache_panel/", include("dj_cache_panel.urls")),
    path("admin/dj_urls_panel/", include("dj_urls_panel.urls")),
    path("admin/dj_signals_panel/", include("dj_signals_panel.urls")),
    path('admin/', admin.site.urls),
    path("__reload__/", include("django_browser_reload.urls")),
    path('', include('accounts.urls')),
]



from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
urlpatterns += [
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    path('silk/', include('silk.urls', namespace='silk')),
]
