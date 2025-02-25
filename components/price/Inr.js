import { server } from "../../config";

const Inr = async (price) => {
  try {
    if (!price || !(price > 0)) {
      return 0;
    }
    const res = await fetch(`${server}/api/conversion/inr/${price}`);
    const data = await res.json();
    
    if (res.status !== 200) {
      throw new Error(data.error || 'Conversion failed');
    }
    
    // Return the matic value from the response
    return data.inr || 0;
    
  } catch (error) {
    console.error("Price conversion error:", error.message);
    return 0;
  }
};

export default Inr;