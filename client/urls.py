from django.urls import path
from . import views

app_name = 'parking'

urlpatterns = [
    path('', views.parking_dashboard, name='dashboard'),
    path('parking/<int:parking_id>/', views.parking_detail, name='parking_detail'),
    path('api/parking/<int:parking_id>/', views.parking_api, name='parking_api'),
]
