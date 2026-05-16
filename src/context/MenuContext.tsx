"use client";
import React, { createContext, useContext, useState, useMemo } from 'react';

type MenuState = {
  visible: boolean;
  x: number;
  y: number;
  content: React.ReactNode; // CONTEXT: ANY BUTTONS INSIDE ARE ALLOWED
};

const MenuContext = createContext<any>(null);

export function MenuProvider({ children }: { readonly children: React.ReactNode }) {
  const [menu, setMenu] = useState<MenuState>({
    visible: false, x: 0, y: 0, content: null 
  });

  const openMenu = (e: React.MouseEvent | React.PointerEvent, content: React.ReactNode) => {
    e.preventDefault();
    setMenu({ visible: true, x: e.pageX, y: e.pageY, content });
  };

  const closeMenu = () => setMenu({ ...menu, visible: false });

  const value = useMemo(() => ({
    menu,
    openMenu,
    closeMenu
  }), [menu, openMenu, closeMenu]);

  return (
    <MenuContext.Provider value={value}>
      {children}
      {menu.visible && (
        <div 
          className="fixed z-100] bg-white dark:bg-zinc-900 border rounded-lg shadow-xl"
          style={{ top: menu.y, left: menu.x }}
        >
          {menu.content}
        </div>
      )}
    </MenuContext.Provider>
  );
}

export const useGlobalMenu = () => useContext(MenuContext);