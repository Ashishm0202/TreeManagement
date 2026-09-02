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
import type { Tree, TreeFormValues } from "@/types/tree";

const TREES_CACHE_KEY = "tree-management:trees-cache";
const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

interface TreeContextValue {
  trees: Tree[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  isOffline: boolean;
  refresh: () => Promise<void>;
  addTree: (input: TreeFormValues) => Promise<void>;
  updateTree: (tree: Tree, input: TreeFormValues) => Promise<void>;
  deleteTree: (tree: Tree) => Promise<void>;
  revertTree: (tree: Tree) => Promise<void>;
}

const TreeContext = createContext<TreeContextValue | undefined>(undefined);

function toTreePayload(
  base: Partial<Tree>,
  input: TreeFormValues,
  username: string | null
): Tree {
  const now = new Date().toISOString();
  return {
    ID: base.ID ?? EMPTY_GUID,
    TreeID: base.TreeID ?? "",
    TreeName: input.TreeName,
    TreeDesc: input.TreeDesc,
    LongDesc: input.LongDesc,
    Age: Number(input.Age) || 0,
    Lattitude: Number(input.Lattitude) || 0,
    Longitude: Number(input.Longitude) || 0,
    Radius: Number(input.Radius) || 0,
    CreatedBy: base.CreatedBy ?? username ?? "app",
    CreatedOn: base.CreatedOn ?? now,
    UpdatedBy: username ?? "app",
    UpdatedOn: now,
    DelFlag: 0,
  };
}

export function TreeProvider({ children }: { children: ReactNode }) {
  const { username } = useAuth();
  const [trees, setTrees] = useState<Tree[]>([]);
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
      await saveTree(toTreePayload({}, input, username));
      await refresh();
    },
    [username, refresh]
  );

  const updateTree = useCallback(
    async (tree: Tree, input: TreeFormValues) => {
      await saveTree(toTreePayload(tree, input, username));
      await refresh();
    },
    [username, refresh]
  );

  const deleteTree = useCallback(
    async (tree: Tree) => {
      await saveTree({
        ...tree,
        DelFlag: 1,
        UpdatedBy: username ?? "app",
        UpdatedOn: new Date().toISOString(),
      });
      await refresh();
    },
    [username, refresh]
  );

  const revertTree = useCallback(
    async (tree: Tree) => {
      await saveTree({
        ...tree,
        DelFlag: 0,
        UpdatedBy: username ?? "app",
        UpdatedOn: new Date().toISOString(),
      });
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
