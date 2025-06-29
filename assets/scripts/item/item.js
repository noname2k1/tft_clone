export const useItem = async (id, name, champUuid, succesCallback) => {
  try {
    const response = await fetch(window.SERVER_PREFIX + "items/use", {
      method: "POST", // Bắt buộc
      headers: {
        "Content-Type": "application/json", // Nếu gửi JSON
      },
      body: JSON.stringify({
        id,
        name,
        champUuid,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    succesCallback(data);
  } catch (e) {
    console.log(e);
  }
};
