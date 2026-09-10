import os
import json
import re
import sys
from datetime import datetime

# Windows konsolunda Türkçe karakterlerin düzgün görünmesi için UTF-8 yapılandırması
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def tarih_temizle(tarih_metni):
    """
    '[YYYY/MM/DD:hh:mm:ss AM/PM]' formatındaki tarih metinlerini temizler ve ISO formatına dönüştürür.
    Örnek: '[2020/07/13:12:00:00 AM]' -> '2020-07-13 00:00:00'
    Giriş yapılmamış veya varsayılan (1976/01/01) tarihleri None olarak döndürür.
    """
    if not tarih_metni or not isinstance(tarih_metni, str):
        return None
    
    temiz_metin = tarih_metni.strip('[] ')
    # İETT veri setinde varsayılan boş tarih olarak 1976/01/01 kullanılmaktadır.
    if not temiz_metin or temiz_metin.startswith('1976/01/01'):
        return None
    
    # YYYY/MM/DD:hh:mm:ss AM/PM deseni
    desen = r'(\d{4})/(\d{2})/(\d{2}):(\d{2}):(\d{2}):(\d{2})\s*(AM|PM)?'
    eslesme = re.match(desen, temiz_metin, re.IGNORECASE)
    
    if eslesme:
        yil, ay, gun, saat, dakika, saniye, am_pm = eslesme.groups()
        saat = int(saat)
        if am_pm:
            am_pm = am_pm.upper()
            if am_pm == 'PM' and saat < 12:
                saat += 12
            elif am_pm == 'AM' and saat == 12:
                saat = 0
        return f"{yil}-{ay}-{gun} {saat:02d}:{dakika}:{saniye}"
    
    return temiz_metin

def iett_verisini_on_isle(veri_yolu, cikti_dizini):
    """
    İETT Durak GeoJSON verisini yükler, karayolu bağlantısı olmayan ada duraklarını ve
    tekrar eden mükerrer durakları temizleyerek JSON formatında kaydeder.
    """
    print(f"Ham veri yükleniyor: {veri_yolu}")
    if not os.path.exists(veri_yolu):
        raise FileNotFoundError(f"Girdi dosyası bulunamadı: {veri_yolu}")

    with open(veri_yolu, 'r', encoding='utf-8') as f:
        geojson_veri = json.load(f)

    ozellikler = geojson_veri.get('features', [])
    print(f"GeoJSON içerisinde toplam {len(ozellikler)} adet durak kaydı bulundu.")

    temiz_kayitlar = []
    gecersiz_koordinat_sayisi = 0
    ada_duragi_sayisi = 0
    mukerrer_sayisi = 0

    gorulen_durak_kodlari = set()
    gorulen_koordinatlar = set()
    durak_tipleri = {}
    ilceler = set()

    # Adalar İlçe Kodu (Anakara karayolu bağlantısı olmayan adaları filtrelemek için)
    ADALAR_ILCE_KODU = '1103'

    for ozellik in ozellikler:
        ozellik_bilgisi = ozellik.get('properties', {})
        geometri = ozellik.get('geometry', {})

        koordinatlar = geometri.get('coordinates', [None, None]) if geometri else [None, None]
        boylam = koordinatlar[0] if len(koordinatlar) > 0 else None
        enlem = koordinatlar[1] if len(koordinatlar) > 1 else None

        # 1. Geçersiz koordinat kontrolü
        if boylam is None or enlem is None:
            gecersiz_koordinat_sayisi += 1
            continue

        ilce_id = str(ozellik_bilgisi.get('ILCEID', '')).strip()

        # 2. Ana karaya bağlı karayolları bağlantısı olan duraklar kontrolü
        # (Adalar ilçesi karayolu ağına bağlı olmadığından filtrelenmektedir)
        if ilce_id == ADALAR_ILCE_KODU or ilce_id == '0':
            ada_duragi_sayisi += 1
            continue

        durak_kodu = str(ozellik_bilgisi.get('DURAK_KODU', '')).strip()
        durak_id = str(ozellik_bilgisi.get('ID', '')).strip()
        durak_adi = str(ozellik_bilgisi.get('ADI', '')).strip()

        # 3. Tekrar eden durakların temizlenmesi (Mükerrer kontrolü)
        # 6 ondalık basamağa yuvarlanmış koordinat ikilisi (~10 cm hassasiyet)
        koordinat_anahtari = (round(float(boylam), 6), round(float(enlem), 6))

        if durak_kodu in gorulen_durak_kodlari or koordinat_anahtari in gorulen_koordinatlar:
            mukerrer_sayisi += 1
            continue

        gorulen_durak_kodlari.add(durak_kodu)
        gorulen_koordinatlar.add(koordinat_anahtari)

        durum = str(ozellik_bilgisi.get('DURUMU', '')).strip()
        durak_tipi = str(ozellik_bilgisi.get('DURAK_TIPI', '')).strip()
        yon_bilgisi = str(ozellik_bilgisi.get('YON_BILGISI', '')).strip()
        mahalle_id = str(ozellik_bilgisi.get('MAHALLEID', '')).strip()
        cep_var = ozellik_bilgisi.get('CEP_VAR')

        son_guncelleme = tarih_temizle(ozellik_bilgisi.get('SON_GUNCELLEME_TARIHI'))
        yapilis_tarihi = tarih_temizle(ozellik_bilgisi.get('YAPILIS_TARIHI'))

        if durak_tipi:
            durak_tipleri[durak_tipi] = durak_tipleri.get(durak_tipi, 0) + 1

        if ilce_id:
            ilceler.add(ilce_id)

        kayit = {
            "id": int(durak_id) if durak_id.isdigit() else durak_id,
            "durak_kodu": durak_kodu,
            "adi": durak_adi,
            "durumu": int(durum) if durum.isdigit() else durum,
            "durak_tipi": durak_tipi,
            "yon_bilgisi": yon_bilgisi,
            "ilce_id": ilce_id,
            "mahalle_id": mahalle_id,
            "cep_var": int(cep_var) if str(cep_var).isdigit() else 0,
            "enlem": float(enlem),
            "boylam": float(boylam),
            "son_guncelleme": son_guncelleme,
            "yapilis_tarihi": yapilis_tarihi
        }
        temiz_kayitlar.append(kayit)

    os.makedirs(cikti_dizini, exist_ok=True)
    json_cikti_yolu = os.path.join(cikti_dizini, 'temizlenmis_duraklar.json')
    with open(json_cikti_yolu, 'w', encoding='utf-8') as f:
        json.dump(temiz_kayitlar, f, ensure_ascii=False, indent=2)

    # Özet istatistikleri kaydet
    ozet_istatistikler = {
        "toplam_ham_kayit": len(ozellikler),
        "islenen_anakara_durak_sayisi": len(temiz_kayitlar),
        "atlanilan_gecersiz_koordinat_sayisi": gecersiz_koordinat_sayisi,
        "atlanilan_ada_durak_sayisi": ada_duragi_sayisi,
        "atlanilan_mukerrer_durak_sayisi": mukerrer_sayisi,
        "benzersiz_ilce_sayisi": len(ilceler),
        "durak_tipleri_ozeti": durak_tipleri,
        "islem_tarihi": datetime.now().isoformat()
    }
    ozet_cikti_yolu = os.path.join(cikti_dizini, 'ozet_istatistikler.json')
    with open(ozet_cikti_yolu, 'w', encoding='utf-8') as f:
        json.dump(ozet_istatistikler, f, ensure_ascii=False, indent=2)

    print("\n--- Veri Ön İşleme Tamamlandı ---")
    print(f"Başarıyla işlenen anakara durak sayısı: {len(temiz_kayitlar)}")
    print(f"Filtrelenen karayolu bağlantısız ada durak sayısı: {ada_duragi_sayisi}")
    print(f"Silinen tekrar eden (mükerrer) durak sayısı: {mukerrer_sayisi}")
    print(f"Atlanan geçersiz koordinatlı durak sayısı: {gecersiz_koordinat_sayisi}")
    print(f"Tespit edilen anakara ilçe sayısı: {len(ilceler)}")
    print(f"Temizlenmiş JSON kaydedildi: {json_cikti_yolu}")
    print(f"Özet istatistikler kaydedildi: {ozet_cikti_yolu}")

    return temiz_kayitlar, ozet_istatistikler

# İstanbul İlçe Kodu - İlçe Adı Eşleşme Sözlüğü
ISTANBUL_ILCE_MAP = {
    '1103': 'Adalar',
    '1166': 'Arnavutköy',
    '1183': 'Ataşehir',
    '1185': 'Avcılar',
    '1186': 'Bağcılar',
    '1237': 'Bahçelievler',
    '1325': 'Bakırköy',
    '1327': 'Başakşehir',
    '1336': 'Bayrampaşa',
    '1338': 'Beşiktaş',
    '1421': 'Beykoz',
    '1449': 'Beylikdüzü',
    '1604': 'Beyoğlu',
    '1622': 'Büyükçekmece',
    '1659': 'Çatalca',
    '1663': 'Çekmeköy',
    '1708': 'Esenler',
    '1739': 'Esenyurt',
    '1782': 'Eyüpsultan',
    '1810': 'Fatih',
    '1823': 'Gaziosmanpaşa',
    '1835': 'Güngören',
    '1852': 'Kadıköy',
    '1886': 'Kağıthane',
    '2003': 'Kartal',
    '2004': 'Küçükçekmece',
    '2005': 'Maltepe',
    '2010': 'Pendik',
    '2012': 'Sancaktepe',
    '2014': 'Sarıyer',
    '2015': 'Silivri',
    '2016': 'Sultanbeyli',
    '2048': 'Sultangazi',
    '2049': 'Şile',
    '2050': 'Şişli',
    '2051': 'Tuzla',
    '2052': 'Ümraniye',
    '2053': 'Üsküdar',
    '2054': 'Zeytinburnu',
    '2055': 'Sancaktepe (Çevre)',
    '2059': 'Gebze / Çevre Sınır',
    '2060': 'Çorlu / Çevre Sınır'
}

def duraklari_ilcelere_gore_grupla(temiz_kayitlar, cikti_dizini):
    """
    Temizlenmiş durak verilerini ilçelerine göre gruplar, hangi ilçede kaç durak
    olduğunu hesaplar, konsola özet tablo yazdırır ve JSON olarak kaydeder.
    """
    print("\n==================================================")
    print("      İlçe Bazlı Durak Gruplama Başlatılıyor     ")
    print("==================================================")

    ilce_gruplari = {}
    ilce_sayilari = {}

    for durak in temiz_kayitlar:
        ilce_id = str(durak.get('ilce_id', ''))
        ilce_adi = ISTANBUL_ILCE_MAP.get(ilce_id, f"Bilinmeyen İlçe ({ilce_id})")
        
        # Durak kaydına ilçe adını da ekleyelim
        durak['ilce_adi'] = ilce_adi

        if ilce_adi not in ilce_gruplari:
            ilce_gruplari[ilce_adi] = []
            ilce_sayilari[ilce_adi] = {
                "ilce_id": ilce_id,
                "ilce_adi": ilce_adi,
                "durak_sayisi": 0
            }

        ilce_gruplari[ilce_adi].append(durak)
        ilce_sayilari[ilce_adi]["durak_sayisi"] += 1

    # Durak sayısına göre çoktan aza sıralama
    sirali_ilce_sayilari = dict(
        sorted(ilce_sayilari.items(), key=lambda item: item[1]["durak_sayisi"], reverse=True)
    )

    # Konsol çıktısı olarak ilçe bazlı durak sayılarını bas
    toplam_durak = len(temiz_kayitlar)
    print(f"\n{'İlçe Adı':<25} | {'İlçe Kodu':<10} | {'Durak Sayısı':<12} | {'Oran (%)':<8}")
    print("-" * 65)

    for ilce_adi, bilgi in sirali_ilce_sayilari.items():
        sayi = bilgi["durak_sayisi"]
        yuzde = (sayi / toplam_durak) * 100 if toplam_durak > 0 else 0
        print(f"{ilce_adi:<25} | {bilgi['ilce_id']:<10} | {sayi:<12} | %{yuzde:.2f}")

    print("-" * 65)
    print(f"{'TOPLAM':<25} | {'-':<10} | {toplam_durak:<12} | %100.00\n")

    # Çıktıları JSON dosyalarına kaydet
    os.makedirs(cikti_dizini, exist_ok=True)
    
    gruplanmis_json_yolu = os.path.join(cikti_dizini, 'ilcelere_gore_duraklar.json')
    with open(gruplanmis_json_yolu, 'w', encoding='utf-8') as f:
        json.dump(ilce_gruplari, f, ensure_ascii=False, indent=2)

    sayilar_json_yolu = os.path.join(cikti_dizini, 'ilce_durak_sayilari.json')
    with open(sayilar_json_yolu, 'w', encoding='utf-8') as f:
        json.dump(sirali_ilce_sayilari, f, ensure_ascii=False, indent=2)

    print(f"İlçe bazlı gruplanmış durak verileri kaydedildi: {gruplanmis_json_yolu}")
    print(f"İlçe durak sayıları özeti kaydedildi: {sayilar_json_yolu}")

    return ilce_gruplari, sirali_ilce_sayilari

if __name__ == "__main__":
    mevcut_dizin = os.path.dirname(os.path.abspath(__file__))
    proje_kok_dizini = os.path.abspath(os.path.join(mevcut_dizin, ".."))
    
    veri_dosya_yolu = os.path.join(proje_kok_dizini, "IETT Bus Stops Data")
    cikti_dizini = os.path.join(mevcut_dizin, "data")
    
    temiz_kayitlar, _ = iett_verisini_on_isle(veri_dosya_yolu, cikti_dizini)
    duraklari_ilcelere_gore_grupla(temiz_kayitlar, cikti_dizini)

