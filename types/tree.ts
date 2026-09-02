export interface Tree {
  ID: string;
  TreeID: string;
  TreeName: string;
  TreeDesc: string;
  Age: number;
  LongDesc: string;
  Lattitude: number;
  Longitude: number;
  Radius: number;
  CreatedBy: string;
  CreatedOn: string;
  UpdatedBy: string | null;
  UpdatedOn: string | null;
  DelFlag: number;
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
  Age: string;
  Radius: string;
  Lattitude: string;
  Longitude: string;
};
