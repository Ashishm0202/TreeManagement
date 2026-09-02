import type { GeneratedTreeId, GenrateTree, Tree } from "@/types/tree";

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

export class ApiError extends Error {
  isOffline: boolean;

  constructor(message: string, isOffline = false) {
    super(message);
    this.isOffline = isOffline;
  }
}

function parseBody(text: string): unknown {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    // Some endpoints double-encode: the body is a JSON string containing
    // another JSON string/array/object, e.g. "[{\"ID\":...}]".
    if (typeof parsed === "string") {
      try {
        return JSON.parse(parsed);
      } catch {
        return parsed;
      }
    }
    return parsed;
  } catch {
    return text;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options?.headers,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("The request timed out. Check your internet connection.", true);
    }
    throw new ApiError(
      "You appear to be offline. Please check your internet connection and try again.",
      true
    );
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  const body = parseBody(text);

  if (!response.ok) {
    const message =
      (body &&
        typeof body === "object" &&
        ((body as any).message || (body as any).title || (body as any).error)) ||
      (typeof body === "string" && body) ||
      `Request failed with status ${response.status}.`;
    throw new ApiError(message);
  }

  return body as T;
}

export interface LoginResult {
  success: boolean;
  message: string;
}

export async function loginUser(username: string, password: string): Promise<LoginResult> {
  const body = await request<any>("LoginUser/Login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  if (typeof body === "string") {
    const normalized = body.trim().toUpperCase();
    const success = normalized === "SUCCESS" || normalized === "OK" || normalized === "TRUE";
    return { success, message: success ? "Login successful." : body };
  }

  const explicitFlag =
    typeof body?.success === "boolean"
      ? body.success
      : typeof body?.isSuccess === "boolean"
        ? body.isSuccess
        : typeof body?.status === "string"
          ? body.status.toLowerCase() === "success"
          : undefined;

  const success = explicitFlag ?? true;
  const message =
    body?.message ?? (success ? "Login successful." : "Invalid username or password.");

  return { success, message };
}

export function getTreeDesignUrl(treeID: string): string {
  return `${BASE_URL}TreeManagement/design/${treeID}`;
}

export async function getTrees(): Promise<Tree[]> {
  const body = await request<any>("TreeManagement");
  console.log("[TreeManagement] GET response:", JSON.stringify(body, null, 2));

  const list: Tree[] = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
  console.log(`[TreeManagement] Parsed ${list.length} tree(s).`);

  return list;
}

export async function GetTreeID(treeID: string): Promise<Tree> {
  const body = await request<any>(`TreeManagement/TreeID/${treeID}`);

  const tree = Array.isArray(body) ? body[0] : body;

  if (!tree || typeof tree !== "object" || !tree.ID) {
    throw new ApiError(`Tree ID "${treeID}" wasn't found.`);
  }

  return tree as Tree;
}

export async function GenrateTreeID(genratetreeid: GenrateTree): Promise<GeneratedTreeId[]> {
  const body = await request<any>("TreeManagement/TreeID/Generate", {
    method: "POST",
    body: JSON.stringify(genratetreeid),
  });

  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;

  if (typeof body === "string" && body.trim().length > 0) {
    throw new ApiError(body);
  }

  if (body && typeof body === "object" && body.message) {
    throw new ApiError(body.message);
  }

  return [];
}

export async function saveTree(tree: Tree): Promise<void> {
  const body = await request<any>("TreeManagement", {
    method: "POST",
    body: JSON.stringify(tree),
  });

  if (typeof body === "string" && body.trim().length > 0) {
    const normalized = body.trim().toUpperCase();
    const success = normalized === "SUCCESS" || normalized === "OK" || normalized === "TRUE";
    if (!success) throw new ApiError(body);
    return;
  }

  if (body && typeof body === "object") {
    const explicitFlag =
      typeof body.success === "boolean"
        ? body.success
        : typeof body.isSuccess === "boolean"
          ? body.isSuccess
          : undefined;
    if (explicitFlag === false) {
      throw new ApiError(body.message ?? "Failed to save tree. Please try again.");
    }
  }
}
