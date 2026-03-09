from scraper.categorizer import categorize_article


def test_ecb_news_maps_to_eurusd():
    instruments = categorize_article(
        "ECB holds rates steady amid inflation concerns",
        "The European Central Bank kept rates at 4.5%."
    )
    assert "EURUSD" in instruments


def test_boe_news_maps_to_gbpusd():
    instruments = categorize_article(
        "Bank of England raises rates to 5.5%",
        "The BOE voted 7-2 to hike rates."
    )
    assert "GBPUSD" in instruments


def test_dax_news_maps_to_ger40():
    instruments = categorize_article(
        "DAX surges 2% on German economic data",
        "The German index reached a new high."
    )
    assert "GER40" in instruments


def test_dow_jones_maps_to_us30():
    instruments = categorize_article("Dow Jones falls 300 points", "DJIA dropped.")
    assert "US30" in instruments


def test_nasdaq_maps_to_nas100():
    instruments = categorize_article("Nasdaq 100 hits record", "NAS100 climbed 1.5%.")
    assert "NAS100" in instruments


def test_sp500_maps_correctly():
    instruments = categorize_article("S&P 500 closes higher", "SPX gained 0.8%.")
    assert "SP500" in instruments


def test_unrelated_news_returns_empty():
    instruments = categorize_article("Local weather forecast", "Sunny skies expected.")
    assert instruments == []


def test_case_insensitive():
    instruments = categorize_article("eurusd falls below 1.05", "euro dollar dropped.")
    assert "EURUSD" in instruments


def test_fed_news_maps_to_dxy():
    instruments = categorize_article(
        "Federal Reserve signals rate pause",
        "FOMC minutes reveal divided committee on rate path."
    )
    assert "DXY" in instruments
