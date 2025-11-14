from django.db import models

class Parking(models.Model):
    name = models.CharField(max_length=200, verbose_name="Название парковки")
    total_spaces = models.IntegerField(verbose_name="Общее количество мест")
    free_spaces = models.IntegerField(verbose_name="Свободные места")
    is_active = models.BooleanField(default=True, verbose_name="Активна")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Парковка"
        verbose_name_plural = "Парковки"

    def __str__(self):
        return f"Parking {self.id}"

class ParkingSpace(models.Model):
    STATUS_CHOICES = [
        ('free', 'Free'),
        ('occupied', 'Occupied'),
    ]

    parking = models.ForeignKey(Parking, on_delete=models.CASCADE, related_name='spaces')
    space_number = models.CharField(max_length=10, verbose_name="Номер места")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='free')
    row = models.IntegerField(verbose_name="Ряд")  # Для группировки мест по рядам

    class Meta:
        verbose_name = "Парковочное место"
        verbose_name_plural = "Парковочные места"
        ordering = ['space_number']

    def __str__(self):
        return f"{self.space_number} ({self.status})"
