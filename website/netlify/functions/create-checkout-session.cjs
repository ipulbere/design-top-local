const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { planType, orderId, email, origin } = JSON.parse(event.body);

        console.log(`[Stripe] Creating session for ${planType}. Origin: ${origin}`);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: planType === 'annual' ? 'Annual Launch Special' : 'Monthly Activation',
                            description: planType === 'annual' ? 'Full year of hosting, maintenance & local SEO' : 'Monthly hosting & maintenance'
                        },
                        unit_amount: planType === 'annual' ? 52900 : 5400,
                        recurring: {
                            interval: planType === 'annual' ? 'year' : 'month',
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/lander`,
            client_reference_id: orderId,
            customer_email: email || undefined,
            metadata: {
                order_id: orderId,
                plan_type: planType
            }
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ url: session.url }),
        };
    } catch (error) {
        console.error('[Stripe Error]', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
