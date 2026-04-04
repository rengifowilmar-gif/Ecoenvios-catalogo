import json

file_path = r"c:\Users\Asus\Desktop\CatalogoPrueba\products.json"

with open(file_path, "r", encoding="utf-8") as file:
    data = json.load(file)

# Se corrige el bug silencioso eliminando las propiedades redundantes
for item in data:
    item.pop("precio_actual", None)
    item.pop("categoria", None)

# Se reescribe el archivo preservando el formato de una línea por objeto
with open(file_path, "w", encoding="utf-8") as file:
    file.write("[\n")
    for i, item in enumerate(data):
        separator = "," if i < len(data) - 1 else ""
        file.write(json.dumps(item, ensure_ascii=False) + separator + "\n")
    file.write("]\n")

print("¡Bug corregido! El archivo JSON ha sido actualizado.")