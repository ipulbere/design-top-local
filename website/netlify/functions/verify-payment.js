const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function (event, context) {
    const { session_id } = event.queryStringParameters;

    if (!session_id) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing session_id' }),
        };
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(session_id);

        return {
            statusCode: 200,
            body: JSON.stringify({
                email: session.customer_details?.email || session.customer_email,
                order_id: session.client_reference_id,
                status: session.payment_status,
            }),
        };
    } catch (error) {
        console.error('Stripe error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to verify payment' }),
        };
    }
};
