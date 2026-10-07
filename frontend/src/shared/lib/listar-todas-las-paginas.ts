const TAMANO_PAGINA = 200;

export async function listarTodasLasPaginas<T>(
  fetchPage: (page: number, size: number) => Promise<{ data: T[]; pages: number }>,
  size = TAMANO_PAGINA,
): Promise<T[]> {
  const primera = await fetchPage(1, size);
  const items = [...primera.data];
  for (let pagina = 2; pagina <= primera.pages; pagina += 1) {
    const siguiente = await fetchPage(pagina, size);
    items.push(...siguiente.data);
  }
  return items;
}
