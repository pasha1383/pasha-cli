class BaseSerializer
  attr_reader :resource

  def initialize(resource)
    @resource = resource
  end

  def self.render(resource, options = {})
    new(resource).as_json(options)
  end

  def self.render_collection(collection, options = {})
    collection.map { |item| new(item).as_json(options) }
  end

  def as_json(options = {})
    raise NotImplementedError, "#{self.class} must implement #as_json"
  end
end
