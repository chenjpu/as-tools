final class MonoCurrentContext extends Mono<Context> implements Fuseable {

	static final MonoCurrentContext INSTANCE = new MonoCurrentContext();

	@SuppressWarnings("unchecked")
	public void subscribe(CoreSubscriber<? super Context> actual) {
		Context ctx = actual.currentContext();
		actual.onSubscribe(Operators.scalarSubscription(actual, ctx));
	}


	///
}