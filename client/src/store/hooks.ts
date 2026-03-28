import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "./store";

/**
 * Pre-typed version of useDispatch.
 * Use this instead of plain `useDispatch` so TypeScript knows about thunks.
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * Pre-typed version of useSelector.
 * Use this instead of plain `useSelector` for full RootState inference.
 */
export const useAppSelector = <T>(selector: (state: RootState) => T): T =>
  useSelector(selector);
