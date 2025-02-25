const handler = async (req, res) => {
  try {
    const price = req.query.price;
    if (!price || isNaN(price)) {
      return res.status(400).json({ error: "Invalid price value" });
    }

    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v2/tools/price-conversion?amount=${price}&symbol=INR&convert=MATIC`,
      {
        headers: {
          "X-CMC_PRO_API_KEY": process.env.COIN_MARKET_CAP_API,
        },
      }
    );
    
    const results = await response.json();
    
    if (!results.data) {
      throw new Error(results.status?.error_message || "Conversion failed");
    }
    console.log(results.data[0].quote)
    const matic = results.data[0].quote.MATIC.price.toFixed(2);
    res.status(200).json({ matic });
    
  } catch (err) {
    console.error("API Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

export default handler;