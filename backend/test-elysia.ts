import { Elysia, t } from "elysia";

const app = new Elysia()
  .post(
    "/test",
    ({ body }) => {
      return "OK";
    },
    {
      body: t.Object({
        foo: t.Optional(t.String()),
        bar: t.Optional(t.Array(t.Object({ baz: t.String() }))),
      }),
    }
  )
  .listen(3002);

console.log("Listening 3002");

async function run() {
  try {
    const res = await fetch("http://localhost:3002/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(null), // sending null as body
    });
    console.log(res.status);
    console.log(await res.text());
  } catch (e) {
    console.error("Fetch threw Error:", e);
  }
  app.stop();
}

run();
