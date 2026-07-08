import {create} from "zustand";

type ContractFilterState = {
  search: string;
  category: string | null;
  frequency: string | null;
  status: string | null;

  setSearch: (search: string) => void;
  setCategory: (category: string | null) => void;
  setFrequency: (frequency: string | null) => void;
  setStatus: (status: string | null) => void;
  reset: () => void;
}

const initialState = {
  search: "",
  category: null,
  frequency: null,
  status: null,
}

export const useContractFilterStore = create<ContractFilterState>((set) => ({
  ...initialState,

  setSearch: (search) => set({search}),
  setCategory: (category) => set({category}),
  setFrequency: (frequency) => set({frequency}),
  setStatus: (status) => set({status}),
  reset: () => set(initialState),
}));
