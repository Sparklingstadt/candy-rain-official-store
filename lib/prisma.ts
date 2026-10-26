import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { withExplicitSslMode } from "./databaseUrl";

const connectionString = withExplicitSslMode(`${process.env.DATABASE_URL}`);

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };