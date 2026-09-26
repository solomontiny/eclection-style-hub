import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type FavoritesContextType = {
  favorites: string[]; // product IDs
  toggleFavorite: (productId: string) => void;
  isFavorited: (productId: string) => boolean;
  clearFavorites: () => void;
};

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("sa_favorites");
        if (saved) setFavorites(JSON.parse(saved));
      } catch {
        // fallback
      }
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      try {
        localStorage.setItem("sa_favorites", JSON.stringify(favorites));
      } catch {
        // fallback
      }
    }
  }, [favorites, isLoaded]);

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const isFavorited = (productId: string) => favorites.includes(productId);

  const clearFavorites = () => setFavorites([]);

  return (
    <FavoritesContext.Provider value={{ favorites: favorites ?? [], toggleFavorite, isFavorited, clearFavorites }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return {
    ...context,
    favorites: context.favorites ?? [],
  };
}
