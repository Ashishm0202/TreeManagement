export interface Tree {
  id: string;
  treeID: string;
  treeName: string;
  treeDesc: string;
  dob: string | null;
  age: number;
  longDesc: string;
  lattitude: number;
  longitude: number;
  radius: number;
  createdBy: string;
  createdOn: string;
  updatedBy: string | null;
  updatedOn: string | null;
  delFlag: number;
}

export interface GenrateTree {
  qty: number;
  by: string;
}

export interface GeneratedTreeId {
  TreeID: string;
}
export type TreeFormValues = {
  TreeName: string;
  TreeDesc: string;
  LongDesc: string;
  /** Calendar day, "YYYY-MM-DD". Empty when the tree has no recorded DOB. */
  Dob: string;
  /** Derived from {@link TreeFormValues.Dob} — never entered by hand. */
  Age: string;
  Radius: string;
  Lattitude: string;
  Longitude: string;
};


export interface GetTree {
  ID: string;
  TreeID: string;
  TreeName: string | null;
  TreeDesc: string | null;
  Dob: string | null;
  Age: number | null;
  LongDesc: string | null;
  Lattitude: number | null;
  Longitude: number | null;
  Radius: number | null;
  CreatedBy: string | null;
  CreatedOn: string | null;
  UpdatedBy: string | null;
  UpdatedOn: string | null;
  TreeIDGeneratedBy: string | null;
  TreeIDGeneratedOn: string | null;
  DelFlag: number;
}

/**
 * Report-facing view of a {@link GetTree}. The API's audit columns are
 * renamed here because, in this app, a tree row is only ever created when
 * someone scans its Tree ID in the field — so "CreatedBy"/"CreatedOn" read
 * as "Scan by"/"Scan on" to the people using the report.
 */
export interface TreeReportRow {
  ID: string;
  TreeID: string;
  TreeName: string | null;
  TreeDesc: string | null;
  LongDesc: string | null;
  Dob: string | null;
  Age: number | null;
  Lattitude: number | null;
  Longitude: number | null;
  Radius: number | null;
  /** Normalized from GetTree.CreatedBy */
  ScanBy: string | null;
  /** Normalized from GetTree.CreatedOn */
  ScanOn: string | null;
  UpdatedBy: string | null;
  UpdatedOn: string | null;
  TreeIDGeneratedBy: string | null;
  TreeIDGeneratedOn: string | null;
  DelFlag: number;
  status: TreeReportStatus;
}

export type TreeReportStatus = "scanned" | "pending" | "deleted";
