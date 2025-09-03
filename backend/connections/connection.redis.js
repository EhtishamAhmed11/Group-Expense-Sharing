import { createClient } from "redis";

const client = createClient({
  url: "redis://localhost:6379",
});

client.on("error", (err) => console.log("Redis Client Error", err));

export const connectRedis = async () => {
  try {
    await client.connect();
    console.log("Connected to Redis");
  } catch (error) {
    console.log(`Error connecting Redis:${error.message}`);
  }
};
export const testRedis = async () => {
  try {
    await client.set("key", "value");
    const value = await client.get("key");
    console.log(value);
  } catch (error) {
    console.log(`Error in Redis Test:${error.message}`);
  }
};
