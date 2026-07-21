def category(aqi):
    if aqi is None:
        return "Bilinmiyor"
    if aqi <= 50:
        return "İyi"
    if aqi <= 100:
        return "Orta"
    if aqi <= 150:
        return "Hassas Gruplar İçin Sağlıksız"
    if aqi <= 200:
        return "Sağlıksız"
    return "Çok Sağlıksız"
