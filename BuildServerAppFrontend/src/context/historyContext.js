import React, { useContext, useState, useEffect } from "react"

const HistoryContext = React.createContext();

export function useLocalHistory() {
  return useContext(HistoryContext);
}

export const HistoryProvider = ({ children }) => {
    const [localItems, setLocalItems] = useState(
        JSON.parse(localStorage.getItem("localItems")) || []
    );

    useEffect(() => {
        fetch('/items')
            .then(response => response.json())
            .then(response => {
                for (let item of response) {
                    let localItem = {
                        id: item._id,
                        expanded: false
                    };

                    localItems.push(localItem);
                }
            });

        const uniqueIds = [];

        const unique = localItems.filter(element => {
            const isDuplicate = uniqueIds.includes(element.id);

            if (!isDuplicate) {
                uniqueIds.push(element.id);

                return true;
            }

            return false;
        });

        localStorage.setItem("localItems", JSON.stringify(unique));
    }, [localItems]);

    const isExpandedHandler = (id) => {
        for (let item of localItems) {
            if (item.id === id) {
                return item.expanded
            }
        }
    };

    const expandedHandler = (id) => () => {
        for (let item of localItems) {
            if (item.id === id) {
                item.expanded = !item.expanded;
                localStorage.setItem("localItems", JSON.stringify(localItems));
                setLocalItems(JSON.parse(localStorage.getItem("localItems")));
            }
        }
    };

    return (
        <HistoryContext.Provider value={{localItems, expandedHandler, isExpandedHandler}}>
            {children}
        </HistoryContext.Provider>
    );
}