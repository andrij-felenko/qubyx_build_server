import React, { useState, useEffect } from 'react';

import Form from '../components/Form';
import History from '../components/History';

import { io } from 'socket.io-client'
import { useLocalHistory } from '../context/historyContext';
const socket = io.connect("http://192.168.0.91:3002")

const StartingPage = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  let historyItemsArr = [...items].reverse();
  const { localItems } = useLocalHistory();
 
  const fetchingDataHandler = () => {
    fetch('/items')
      .then(response => response.json())
      .then(responseData => {
        let arr1 = [];
        let arr2 = [];
        let arr3 = [];

        for (let i = 0; i < responseData.length; i++) {
            if (responseData[i].highPriority === true && i !== 0) {
              arr1.push(responseData[i]);
            } else if (responseData[i].highPriority === false && i !== 0) {
              arr2.push(responseData[i]);
            };

            if (arr1.length > 0 && arr2.length > 0) {
              arr3 = [responseData[0], ...arr1, ...arr2];
            } else {
              arr3 = responseData;
            }
        }
        
        setItems(arr3);
        setIsLoading(false);
    }).catch(error => {
      console.log('Something went wrong');
    });
  };

  const fetchingLocalHistory = () => {
    fetch('/items')
      .then(response => response.json())
      .then(response => {
          for (let item of response) {
              let localItem = {
                id: item._id,
                expanded: false,
              }

              localItems.push(localItem);
          }
      })

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
  }

  const addDataToDataBase = async (item) => {
    fetchingLocalHistory();
    await socket.emit("sending-data", { item });
  }

  const removeHistoryItemHandler = async (historyItemId) => {
    await socket.emit("remove-data", historyItemId);
  }

  useEffect(() => {
    fetchingDataHandler();
    socket.on("receive-data", () => {
        fetchingLocalHistory();
        fetchingDataHandler();
    })
  }, [localItems])

  return (
      <div className='starting-page-container'>
          <Form onAddItem={addDataToDataBase} />
          <div className='history-container'> 
            <History 
              historyItems={historyItemsArr} 
              onRemoveHistoryItem={removeHistoryItemHandler} 
              showLoading={isLoading}
            />
          </div>
      </div>
  );
};

export default StartingPage;