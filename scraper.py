import asyncio
import json
import re
import os
import urllib.parse
from datetime import datetime
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError

# 1. DICCIONARIO MULTI-CATEGORÍA
# Agrega aquí todas las URLs de las categorías que deseas raspar.
# La clave (ej. "Aseo Hogar") será la que use tu frontend de Netlify para los filtros.
CATEGORIAS_D1 = {
    "Aseo hogar": "https://domicilios.tiendasd1.com/ca/aseo%20hogar/ASEO%20HOGAR",
    "Aseo y cuidado personal": "https://domicilios.tiendasd1.com/ca/aseo%20y%20cuidado%20personal/ASEO%20Y%20CUIDADO%20PERSONAL",
    "Bebé": "https://domicilios.tiendasd1.com/ca/bebe/BEB%C3%89",
    "Alimentos y despensa": "https://domicilios.tiendasd1.com/ca/alimentos%20y%20despensa/ALIMENTOS%20Y%20DESPENSA",
    #"Extraordinarios": "https://domicilios.tiendasd1.com/ca/extraordinarios/EXTRAORDINARIOS",
    #"Congelados": "https://domicilios.tiendasd1.com/ca/congelados/CONGELADOS",
    #"Lacteos": "https://domicilios.tiendasd1.com/ca/lacteos/L%C3%81CTEOS",
    #"Mascotas": "https://domicilios.tiendasd1.com/ca/mascotas/MASCOTAS",
    #"Bebidas": "https://domicilios.tiendasd1.com/ca/bebidas/BEBIDAS",
    "Otros": "https://domicilios.tiendasd1.com/ca/otros/OTROS",
    "Lo nuevo": "https://domicilios.tiendasd1.com/ca/lo%20nuevo/LO%20NUEVO"
    # Añade más categorías según necesites...
}

ARCHIVO_CATALOGO = 'products.json'

def cargar_catalogo_existente(filepath):
    """Carga el JSON actual y lo convierte en un diccionario indexado por id_producto"""
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                datos = json.load(f)
                print(f"[*] Catálogo histórico cargado: {len(datos)} artículos existentes.")
                # Convertimos la lista en un diccionario {id_producto: {datos_del_producto}}
                return {item["id"]: item for item in datos}
        except json.JSONDecodeError:
            print("[!] El archivo JSON actual está corrupto o vacío. Se creará uno nuevo.")
            return {}
    print("[*] No se encontró catálogo previo. Iniciando base de datos desde cero.")
    return {}

async def ejecutar_scraper():
    # Cargar datos históricos a la memoria (LÓGICA DE PERSISTENCIA)
    catalogo_actual = cargar_catalogo_existente(ARCHIVO_CATALOGO)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--disable-gpu",
                "--disable-dev-shm-usage", 
                "--no-sandbox",
                "--disable-blink-features=AutomationControlled" 
            ]
        )

        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )

        page = await context.new_page()

        # 2. ITERACIÓN MULTI-CATEGORÍA
        for nombre_categoria, url in CATEGORIAS_D1.items():
            print(f"\n==================================================")
            print(f"[*] Iniciando extracción en categoría: {nombre_categoria.upper()}")
            print(f"==================================================")
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=60000)

                try:
                    btn_cookies = page.locator("button:has-text('Aceptar')")
                    if await btn_cookies.is_visible(timeout=3000):
                        await btn_cookies.click()
                except Exception:
                    pass 

                try:
                    await page.wait_for_selector("img[src*='/IMAGENES/']", timeout=15000)
                except Exception:
                    print(f"[!] No se detectaron imágenes rápido en {nombre_categoria}. Intentando forzar...")

                ids_procesados_en_sesion = set() 
                pagina_actual = 1
                
                while True:
                    print(f"[-] {nombre_categoria} - Procesando página {pagina_actual}...")
                    productos_antes = len(ids_procesados_en_sesion)

                    await scroll_infinito(page)
                    tarjetas = await page.locator("article, div[class*='product' i], div[class*='card' i]").all()

                    for tarjeta in tarjetas:
                        try:
                            img_loc = tarjeta.locator("img").first
                            imagen_url = ""
                            if await img_loc.count() > 0:
                                src = await img_loc.get_attribute("src") or ""
                                data_src = await img_loc.get_attribute("data-src") or ""
                                srcset = await img_loc.get_attribute("srcset") or ""
                                for u in [src, data_src, srcset]:
                                    match_url = re.search(r'(https?://[^"\'\s]+/IMAGENES/\d+/[^"\'\s]+)', u, re.IGNORECASE)
                                    if match_url:
                                        imagen_url = match_url.group(1)
                                        break
                                        
                            if "IMAGENES" not in imagen_url:
                                html_tarjeta = await tarjeta.inner_html()
                                match_html = re.search(r'(https?://[^"\'\s]+/IMAGENES/\d+/[^"\'\s]+)', html_tarjeta, re.IGNORECASE)
                                if match_html:
                                    imagen_url = match_html.group(1)

                            match_id = re.search(r'/IMAGENES/(\d+)/', imagen_url, re.IGNORECASE)
                            if not match_id:
                                continue 
                                
                            id_producto = int(match_id.group(1))
                            
                            if id_producto in ids_procesados_en_sesion:
                                continue
                                
                            texto_tarjeta = await tarjeta.text_content() or ""
                            precio_actual = 0
                            nombre = "Producto sin nombre"
                            
                            match_precio = re.search(r'\$\s*([\d\.,]+)', texto_tarjeta)
                            if match_precio:
                                precio_limpio = match_precio.group(1).replace('.', '').replace(',', '')
                                precio_actual = int(precio_limpio)
                                
                            if await img_loc.count() > 0:
                                nombre = await img_loc.get_attribute("alt") or ""
                                
                            nombre = nombre.strip()
                            if not nombre or len(nombre) < 3 or "..." in nombre or "tiendas d1" in nombre.lower():
                                texto_limpio = re.sub(r'\s+', ' ', texto_tarjeta).strip()
                                # Limpiamos un posible "Tiendas D1" al inicio del texto por precaución
                                texto_limpio = re.sub(r'(?i)^tiendas d1\s*', '', texto_limpio)
                                match_nombre = re.search(r'^(.*?)\s*\$', texto_limpio)
                                if match_nombre:
                                    nombre = match_nombre.group(1).strip()

                            # Si el nombre extraído capturó el menú de navegación o es inválido, inferirlo de la URL
                            if len(nombre) > 80 or "Categorias" in nombre or "Inicio" in nombre:
                                match_url_name = re.search(r'/IMAGENES/\d+/([^/]+)\.[a-zA-Z0-9]{3,4}(?:$|\?)', imagen_url, re.IGNORECASE)
                                if match_url_name:
                                    nombre_url = urllib.parse.unquote(match_url_name.group(1))
                                    nombre_url = re.sub(r'[-\_]\d{1,2}$', '', nombre_url) # Elimina sufijos de imagen como -01, _00
                                    nombre_url = re.sub(rf'[-\_]?{id_producto}', '', nombre_url) # Elimina el ID si está presente
                                    nombre = nombre_url.replace('-', ' ').replace('_', ' ').strip().upper()

                            if precio_actual > 0: 
                                estado_disponible = "agotado" not in texto_tarjeta.lower()
                                
                                # 3. LÓGICA DE UPSERT (Proteger 'unidadesPorCaja')
                                if id_producto in catalogo_actual:
                                    # El producto ya existe: Actualizamos datos volátiles, conservamos el resto
                                    catalogo_actual[id_producto]["price"] = precio_actual
                                    catalogo_actual[id_producto]["disponible"] = estado_disponible
                                    catalogo_actual[id_producto]["imageUrl"] = imagen_url
                                    catalogo_actual[id_producto]["fecha_extraccion"] = datetime.now().isoformat()
                                    # Aseguramos que tenga la categoría correcta para los filtros
                                    catalogo_actual[id_producto]["category"] = nombre_categoria
                                else:
                                    # El producto es NUEVO: Lo insertamos con valor 1 por defecto en cajas
                                    catalogo_actual[id_producto] = {
                                        "id": id_producto,
                                        "name": nombre,
                                        "price": precio_actual,
                                        "disponible": estado_disponible,
                                        "category": nombre_categoria,
                                        "imageUrl": imagen_url,
                                        "fecha_extraccion": datetime.now().isoformat(),
                                        "unidadesPorCaja": 1 # Valor default para que asignes manualmente después
                                    }
                                
                                ids_procesados_en_sesion.add(id_producto)

                        except Exception as inner_e:
                            print(f"[!] Error extrayendo un producto: {inner_e}")
                            continue
                            
                    if len(ids_procesados_en_sesion) == productos_antes:
                        print(f"[-] Fin de la categoría {nombre_categoria}.")
                        break
                    
                    try:
                        btn_next = page.locator("li.ant-pagination-next, ul[class*='pagination'] svg[data-icon='right']").first
                        if await btn_next.is_visible(timeout=3000):
                            is_disabled = await btn_next.evaluate("""(svg) => {
                                let curr = svg;
                                while (curr && curr !== document.body) {
                                    if (curr.hasAttribute('disabled') || 
                                        curr.classList.contains('disabled') || 
                                        curr.classList.contains('ant-pagination-disabled')) {
                                        return true;
                                    }
                                    curr = curr.parentElement;
                                }
                                return false;
                            }""")
                            
                            if not is_disabled:
                                await btn_next.click(force=True) 
                                await page.wait_for_timeout(4000) 
                                pagina_actual += 1
                                continue
                            else:
                                break
                        else:
                            break
                    except Exception:
                        break

            except PlaywrightTimeoutError:
                print(f"[!] Timeout al cargar la URL: {url}")
            except Exception as e:
                print(f"[!] Error crítico procesando {url}: {e}")

        # 4. Exportación convirtiendo el diccionario de vuelta a lista
        lista_final_exportar = list(catalogo_actual.values())
        exportar_json(lista_final_exportar, ARCHIVO_CATALOGO)
        
        await browser.close()

async def scroll_infinito(page):
    last_height = await page.evaluate("document.body.scrollHeight")
    intentos_sin_cambio = 0
    
    while intentos_sin_cambio < 3: 
        for i in range(1, 11):
            await page.evaluate(f"window.scrollTo(0, document.body.scrollHeight * {i/10})")
            await page.wait_for_timeout(300)
            
        await page.wait_for_timeout(1000)
        
        try:
            btn_pag = page.locator("button:has-text('Mostrar más'), button:has-text('Cargar más')")
            if await btn_pag.first.is_visible(timeout=500):
                await btn_pag.first.click()
        except Exception:
            pass
        
        new_height = await page.evaluate("document.body.scrollHeight")
        if new_height == last_height:
            intentos_sin_cambio += 1
        else:
            intentos_sin_cambio = 0
            last_height = new_height

def exportar_json(datos, filepath):
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('[\n')
            for i, item in enumerate(datos):
                linea = json.dumps(item, ensure_ascii=False)
                if i < len(datos) - 1:
                    f.write(linea + ',\n')
                else:
                    f.write(linea + '\n')
            f.write(']')
        print(f"\n[*] ÉXITO TOTAL: Se exportaron {len(datos)} artículos a {filepath}")
    except IOError as e:
        print(f"[!] Error de escritura en disco: {e}")

if __name__ == "__main__":
    asyncio.run(ejecutar_scraper())
