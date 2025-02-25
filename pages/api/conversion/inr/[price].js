const handler = async (req, res) => {
  try {
    const price = req.query.price;
    // 3890 is the ID for MATIC
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v2/tools/price-conversion?amount=${price}&symbol=MATIC&convert=INR`,
      {
        headers: {
          "X-CMC_PRO_API_KEY": process.env.COIN_MARKET_CAP_API,
        },
      }
    );
    const results = await response.json();
    if (!results.data) {
      throw new Error(results.status.error_message);
    }
    const inr = results.data[0].quote.INR.price.toFixed(2)
    res.status(200).json({ inr });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export default handler;