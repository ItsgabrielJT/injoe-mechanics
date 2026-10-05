PRODUCCION = {"2", "produccion", "producción", "production", "prod"}
PRUEBAS = {"1", "pruebas", "prueba", "test", "testing", "dev"}


def normalizar_entorno_sri(valor: object | None) -> str | None:
    if valor is None:
        return None
    texto = str(valor).strip().lower()
    if not texto:
        return None
    if texto in PRODUCCION:
        return "2"
    if texto in PRUEBAS:
        return "1"
    return None


def etiqueta_entorno_sri(codigo: str | None) -> str:
    return "PRODUCCIÓN (2)" if str(codigo or "") == "2" else "PRUEBAS (1)"
