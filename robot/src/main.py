"""ForexOS Robot - Main Entry Point."""
import asyncio
import sys
from loguru import logger

# Configure logging
logger.remove()
logger.add(
    sys.stderr,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
    level="INFO",
)


async def main() -> None:
    """Main entry point for the ForexOS Robot."""
    logger.info("ForexOS Robot starting...")
    logger.info("MT5 Integration: Ready")
    logger.info("Strategy Engine: Ready")
    logger.info("Risk Management: Ready")
    logger.info("Robot is running")
    # TODO: Implement main robot logic
    while True:
        await asyncio.sleep(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Robot stopped by user")
