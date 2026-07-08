import {create} from "zustand";

type BillFilterState = {
  search: string;
  supplier: string | null;
  supplierCategory: string | null;
  itemCategory: string | null;

  setSearch: (search: string) => void;
  setSupplier: (supplier: string | null) => void;
  setSupplierCategory: (supplierCategory: string | null) => void;
  setItemCategory: (itemCategory: string | null) => void;
  reset: () => void;
}

const initialState = {
  search: "",
  supplier: null,
  supplierCategory: null,
  itemCategory: null,
}

export const useBillFilterStore = create<BillFilterState>((set) => ({
  ...initialState,
  setSearch: (search) => set({search}),
  setSupplier: (supplier) => set({supplier}),
  setSupplierCategory: (supplierCategory) => set({supplierCategory}),
  setItemCategory: (itemCategory) => set({itemCategory}),
  reset: () => set(initialState),
}));
