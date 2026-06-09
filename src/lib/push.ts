export async function sendPushNotification(expoToken: string, title: string, body: string, data?: object) {
  if (!expoToken || !expoToken.startsWith('ExponentPushToken[')) {
    console.warn("Invalid Expo push token:", expoToken);
    return { success: false, error: "Invalid Expo push token" };
  }
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: expoToken,
        sound: 'default',
        title,
        body,
        data
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`Expo push failed: ${res.status} - ${errText}`);
      return { success: false, error: errText };
    }
    const json = await res.json();
    console.log("Expo push response:", json);
    return { success: true, data: json };
  } catch (e: any) {
    console.error("Failed to send push notification:", e.message || e);
    return { success: false, error: e.message || e };
  }
}
