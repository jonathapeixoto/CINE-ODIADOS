export const COOKIE_SERVICOS = 'servicos'
export const DIAS_DO_COOKIE = 365

export function decodificarServicos(valor: string | undefined): number[] {
  return (valor ?? '')
    .split(',')
    .map((parte) => Number(parte.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)
}

export const codificarServicos = (ids: number[]): string => ids.join(',')
