from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.core.paginator import Paginator
from .models import Parking, ParkingSpace

def parking_dashboard(request):
    parkings = Parking.objects.filter(is_active=True)
    return render(request, 'parking/dashboard.html', {
        'parkings': parkings
    })

def parking_detail(request, parking_id):
    parking = get_object_or_404(Parking, id=parking_id, is_active=True)
    
    all_spaces = parking.spaces.all()
    
    space_rows = []
    current_row = []
    current_row_number = None
    
    for space in all_spaces:
        if current_row_number is None:
            current_row_number = space.row
        
        if space.row == current_row_number:
            current_row.append(space)
        else:
            if current_row:
                space_rows.append(current_row)
            current_row = [space]
            current_row_number = space.row
    
    if current_row:
        space_rows.append(current_row)
    
    # Пагинация для кнопок Last/Next
    all_parkings = list(Parking.objects.filter(is_active=True).order_by('id'))
    current_index = None
    for i, p in enumerate(all_parkings):
        if p.id == parking.id:
            current_index = i
            break
    
    if current_index is not None:
        has_prev = current_index > 0
        has_next = current_index < len(all_parkings) - 1
        prev_parking = all_parkings[current_index - 1] if has_prev else None
        next_parking = all_parkings[current_index + 1] if has_next else None
    else:
        prev_parking = next_parking = None
    
    return render(request, 'parking/parking_detail.html', {
        'parking': parking,
        'space_rows': space_rows,
        'prev_parking': prev_parking,
        'next_parking': next_parking,
    })

def parking_api(request, parking_id):
    parking = get_object_or_404(Parking, id=parking_id)
    
    spaces = list(parking.spaces.values('space_number', 'status', 'row'))
    
    return JsonResponse({
        'parking': {
            'id': parking.id,
            'name': f"Parking #{parking.id}",
            'total_spaces': parking.total_spaces,
            'free_spaces': parking.free_spaces,
        },
        'spaces': spaces
    })
