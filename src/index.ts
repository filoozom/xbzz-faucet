import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import Fastify from "fastify";
import Pino from "pino";
import { FromSchema } from "json-schema-to-ts";

import { Wallet, providers, Contract } from "ethers";
import fastifySensible from "fastify-sensible";

// Config
const {
  RPC_URL = "https://rpc.gnosischain.com/",
  XBZZ_ADDRESS = "0xdbf3ea6f5bee45c02255b2c26a16f300502f68da",
  LOG_LEVEL = "warn",
  PRIVATE_KEY,
} = process.env;

if (!PRIVATE_KEY) {
  console.error("Missing PRIVATE_KEY environment variable");
  process.exit(1);
}

// Fastify + logging
const fastify = Fastify({ logger: false });
const pino = Pino({ base: null, level: LOG_LEVEL });

// Fastify plugins
fastify.register(fastifySensible);

// Walllet
const { JsonRpcProvider } = providers;
const provider = new JsonRpcProvider(RPC_URL);
const wallet = new Wallet(PRIVATE_KEY, provider);

// Contract
const abiPath = path.resolve(fileURLToPath(import.meta.url), "../abi.json");
const abi = await readFile(abiPath, "utf8");
const gbzz = new Contract(XBZZ_ADDRESS, abi, wallet);

// Schema
const postBodySchema = {
  type: "null",
} as const;

type PostParams = {
  address: string;
};

fastify.post<{
  Body: FromSchema<typeof postBodySchema>;
  Params: PostParams;
}>(
  "/xbzz/:address",
  { schema: { body: postBodySchema } },
  async ({ params: { address } }, res) => {
    const action = "funding-xbzz";
    pino.info({ action, address });

    try {
      // Fund 0.1 xBZZ
      const tx = await gbzz.transfer(address, 10n ** 15n);
      await tx.wait();
      res.send();
    } catch (err) {
      pino.error({ action, err });
      res.internalServerError();
    }
  }
);

try {
  await fastify.listen(3186, "0.0.0.0");
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
