import { env } from "@/env";

const PRINTFUL_BASE_URL = "https://api.printful.com";

type PrintfulResponse<T> = {
  code: number;
  result: T;
};

export const printfulRequest = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const response = await fetch(`${PRINTFUL_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.PRINTFUL_API_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Printful request failed (${response.status} ${response.statusText}): ${responseText}`,
    );
  }

  let payload: PrintfulResponse<T>;
  try {
    payload = JSON.parse(responseText) as PrintfulResponse<T>;
  } catch {
    throw new Error(`Invalid Printful JSON response: ${responseText}`);
  }

  if (payload.code !== 200) {
    throw new Error(`Printful request returned code ${payload.code}`);
  }

  return payload.result;
};
