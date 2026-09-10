import os
import sys

# Windows konsolunda Türkçe karakterlerin düzgün görünmesi için UTF-8 yapılandırması
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

from preprocess import iett_verisini_on_isle, duraklari_ilcelere_gore_grupla

def ana_calistirici():
    """
    Backend sunucusu ve veri ön işleme adımlarını başlatır.
    """
    print("==================================================")
    print("      İETT Durak Verisi Backend Sunucusu         ")
    print("==================================================")
    print("[BİLGİ] Veri ön işleme adımı başlatılıyor...\n")
    
    mevcut_dizin = os.path.dirname(os.path.abspath(__file__))
    proje_kok_dizini = os.path.abspath(os.path.join(mevcut_dizin, ".."))
    
    veri_dosya_yolu = os.path.join(proje_kok_dizini, "IETT Bus Stops Data")
    cikti_dizini = os.path.join(mevcut_dizin, "data")
    
    try:
        # 1. Aşama: Veri Ön İşleme (Filtreleme & Tekilleştirme)
        temiz_kayitlar, istatistikler = iett_verisini_on_isle(veri_dosya_yolu, cikti_dizini)
        print("\n[BAŞARILI] Veri ön işleme adımı eksiksiz tamamlandı.")
        print(f"[BİLGİ] Toplam {len(temiz_kayitlar)} durak verisi hazır hale getirildi.")

        # 2. Aşama: İlçe Bazlı Durak Gruplama & Sayım
        ilce_gruplari, ilce_sayilari = duraklari_ilcelere_gore_grupla(temiz_kayitlar, cikti_dizini)
        print("\n[BAŞARILI] İlçe bazlı durak gruplama ve sayım işlemi tamamlandı.")

    except Exception as e:
        print(f"\n[HATA] Ön işleme sırasında bir hata oluştu: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    ana_calistirici()
