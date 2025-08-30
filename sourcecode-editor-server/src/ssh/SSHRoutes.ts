import { OTelRequestSpan } from "@devopsplaybook.io/otel-utils-fastify";
import { FastifyInstance } from "fastify";
import { AuthGetUserSession } from "../users/Auth";
import { SSHGetPublicKey } from "./SSH";

export class SSHRoutes {
  //
  public async getRoutes(fastify: FastifyInstance): Promise<void> {
    //
    fastify.get("/public-key", async (req, res) => {
      const userSession = await AuthGetUserSession(req);
      if (!userSession.isAuthenticated) {
        return res.status(403).send({ error: "Access Denied" });
      }
      return res
        .status(201)
        .send({ public_key: await SSHGetPublicKey(OTelRequestSpan(req)) });
    });
  }
}
