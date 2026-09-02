import { createContext, useContext } from "react";

export const MenuStudioWorkspaceContext = createContext(null);

export function useMenuStudioWorkspace() {
  return useContext(MenuStudioWorkspaceContext);
}
