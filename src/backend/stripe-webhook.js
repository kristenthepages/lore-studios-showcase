// Sanitized excerpt from the Lore Studios Express backend.
// Verifies Stripe webhook signatures before changing account data.
//
// Important: mount this route before app.use(express.json()).

export function registerStripeWebhook({
  app,
  stripe,
  onCheckoutCompleted,
  onSubscriptionUpdated,
  onSubscriptionDeleted,
}) {
  app.post(
    "/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const signature = req.headers["stripe-signature"];

      let event;

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET,
        );
      } catch (error) {
        console.error(
          "Stripe webhook verification failed:",
          error.message,
        );

        return res.status(400).send("Invalid webhook signature");
      }

      try {
        switch (event.type) {
          case "checkout.session.completed":
            await onCheckoutCompleted?.(event.data.object);
            break;

          case "customer.subscription.updated":
            await onSubscriptionUpdated?.(event.data.object);
            break;

          case "customer.subscription.deleted":
            await onSubscriptionDeleted?.(event.data.object);
            break;

          default:
            // Other Stripe events are intentionally ignored.
            break;
        }

        return res.json({ received: true });
      } catch (error) {
        console.error(
          `Stripe event processing failed (${event.type}):`,
          error,
        );

        return res.status(500).json({
          error: "Webhook processing failed",
        });
      }
    },
  );
}
