import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/contexts/AuthContext";
import { ApiError, getTrees, saveTree } from "@/services/api";
import type { GetTree, Tree, TreeFormValues } from "@/types/tree";
import { ageFromDob, toApiDate, toDateInput } from "@/utils/date";

const TREES_CACHE_KEY = "tree-management:trees-cache";
const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

interface TreeContextValue {
  trees: GetTree[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  isOffline: boolean;
  refresh: () => Promise<void>;
  addTree: (input: TreeFormValues) => Promise<void>;
  updateTree: (tree: GetTree, input: TreeFormValues) => Promise<void>;
  deleteTree: (tree: GetTree) => Promise<void>;
  revertTree: (tree: GetTree) => Promise<void>;
}

const TreeContext = createContext<TreeContextValue | undefined>(undefined);

/**
 * The API hands rows back in PascalCase (`GetTree`) but only accepts camelCase
 * on the way in (`Tree`), so every write is funnelled through here — the two
 * shapes are never allowed to mix.
 */
function toTreePayload(
  base: Partial<GetTree>,
  input: TreeFormValues,
  username: string | null
): Tree {
  const now = new Date().toISOString();
  return {
    id: base.ID ?? EMPTY_GUID,
    treeID: base.TreeID ?? "",
    treeName: input.TreeName,
    treeDesc: input.TreeDesc,
    dob: toApiDate(input.Dob),
    age: Number(input.Age) || 0,
    longDesc: input.LongDesc,
    lattitude: Number(input.Lattitude) || 0,
    longitude: Number(input.Longitude) || 0,
    radius: Number(input.Radius) || 0,
    createdBy: base.CreatedBy ?? username ?? "app",
    createdOn: base.CreatedOn ?? now,
    updatedBy: username ?? "app",
    updatedOn: now,
    delFlag: base.DelFlag ?? 0,
  };
}

/**
 * Single exit for every write, so the exact body going to the API is visible in
 * the console alongside the action that produced it.
 */
async function logAndSave(action: string, payload: Tree) {
  console.log(`[TreeContext] ${action} payload:`, JSON.stringify(payload, null, 2));
  await saveTree(payload);
}

/** The row as it stands, resent with a different delete flag. */
function toFlagPayload(tree: GetTree, username: string | null, delFlag: number): Tree {
  return {
    ...toTreePayload(tree, toFormValues(tree), username),
    delFlag,
  };
}

/** A fetched row narrowed down to the fields the form and the API care about. */
export function toFormValues(tree: GetTree): TreeFormValues {
  return {
    TreeName: tree.TreeName ?? "",
    TreeDesc: tree.TreeDesc ?? "",
    LongDesc: tree.LongDesc ?? "",
    Dob: toDateInput(tree.Dob),
    // Recomputed against today, so a row saved years ago doesn't carry a stale
    // age back up to the server. Rows with no DOB keep whatever was stored.
    Age: String(ageFromDob(tree.Dob) ?? tree.Age ?? ""),
    Radius: tree.Radius != null ? String(tree.Radius) : "",
    Lattitude: tree.Lattitude != null ? String(tree.Lattitude) : "",
    Longitude: tree.Longitude != null ? String(tree.Longitude) : "",
  };
}

export function TreeProvider({ children }: { children: ReactNode }) {
  const { username } = useAuth();
  const [trees, setTrees] = useState<GetTree[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const loadFromCache = useCallback(async () => {
    const cached = await AsyncStorage.getItem(TREES_CACHE_KEY);
    if (cached) setTrees(JSON.parse(cached));
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const list = await getTrees();
      setTrees(list);
      setIsOffline(false);
      await AsyncStorage.setItem(TREES_CACHE_KEY, JSON.stringify(list));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setIsOffline(err.isOffline);
        if (err.isOffline) await loadFromCache();
      } else {
        setError("Couldn't load trees. Please try again.");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [loadFromCache]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addTree = useCallback(
    async (input: TreeFormValues) => {
      await logAndSave("Add tree", toTreePayload({}, input, username));
      await refresh();
    },
    [username, refresh]
  );

  const updateTree = useCallback(
    async (tree: GetTree, input: TreeFormValues) => {
      await logAndSave("Edit tree", toTreePayload(tree, input, username));
      await refresh();
    },
    [username, refresh]
  );

  const deleteTree = useCallback(
    async (tree: GetTree) => {
      await logAndSave("Delete tree", toFlagPayload(tree, username, 1));
      await refresh();
    },
    [username, refresh]
  );

  const revertTree = useCallback(
    async (tree: GetTree) => {
      await logAndSave("Revert tree", toFlagPayload(tree, username, 0));
      await refresh();
    },
    [username, refresh]
  );

  const value = useMemo(
    () => ({
      trees,
      isLoading,
      isRefreshing,
      error,
      isOffline,
      refresh,
      addTree,
      updateTree,
      deleteTree,
      revertTree,
    }),
    [
      trees,
      isLoading,
      isRefreshing,
      error,
      isOffline,
      refresh,
      addTree,
      updateTree,
      deleteTree,
      revertTree,
    ]
  );

  return <TreeContext.Provider value={value}>{children}</TreeContext.Provider>;
}

export function useTrees() {
  const ctx = useContext(TreeContext);
  if (!ctx) throw new Error("useTrees must be used within a TreeProvider");
  return ctx;
}
