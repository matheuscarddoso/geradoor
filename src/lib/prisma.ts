import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/*
 * O Prisma 7 fala com o Postgres pelo driver `pg`, através do adaptador, e
 * não mais por um motor próprio. O `pg` sem configuração espera a conexão
 * para sempre; os 5 s repõem o limite que o motor antigo tinha, para uma
 * falha de rede virar erro rápido em vez de requisição pendurada.
 */
function criarCliente() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5_000,
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Uma instância só por processo: no dev, o hot reload recriaria o pool de
// conexões a cada salvamento.
export const prisma = globalForPrisma.prisma ?? criarCliente();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
