import { resolver } from "@blitzjs/rpc"
import { CreateNewElement } from "../validations"

export default resolver.pipe(
  resolver.zod(CreateNewElement),
  async ({ startPlace, fileName }, ctx) => {
    console.log("resultado", fileName)
  }
)
