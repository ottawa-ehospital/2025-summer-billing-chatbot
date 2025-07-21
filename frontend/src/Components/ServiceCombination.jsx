import React, { useState } from 'react';
import axios from 'axios';

const ServiceCombination = () => {
  const [description, setDescription] = useState('');
  const [maxServices, setMaxServices] = useState(5);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const findOptimalServices = async () => {
    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/services/optimal', {
        description: description,
        max_services: maxServices
      });

      setResults(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults(null);
    setError('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        AI Service Combination Assistant
      </h2>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe the medical service needed:
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Patient needs emergency assessment after car accident, includes consultation and basic tests"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows="4"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximum number of services to recommend:
          </label>
          <input
            type="number"
            value={maxServices}
            onChange={(e) => setMaxServices(parseInt(e.target.value) || 5)}
            min="1"
            max="10"
            className="w-32 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={findOptimalServices}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Finding Services...' : 'Find Optimal Services'}
          </button>
          
          {results && (
            <button
              onClick={clearResults}
              className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600"
            >
              Clear Results
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {results && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">
            Recommended Services
          </h3>
          
          {results.explanation && (
            <div className="mb-4 p-4 bg-blue-50 rounded-md">
              <p className="text-blue-800">{results.explanation}</p>
            </div>
          )}

          {results.recommendations && results.recommendations.length > 0 ? (
            <div className="space-y-4">
              {results.recommendations.map((service, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-lg text-gray-800">
                      {service.code}
                    </h4>
                    <span className="text-lg font-bold text-green-600">
                      ${service.charge?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-2">{service.description}</p>
                  
                  {service.reasoning && (
                    <p className="text-sm text-gray-500 italic">
                      {service.reasoning}
                    </p>
                  )}
                </div>
              ))}
              
              <div className="border-t pt-4 mt-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-800">
                    Total Cost:
                  </span>
                  <span className="text-2xl font-bold text-green-600">
                    ${results.total_cost?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">No services found matching your description.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ServiceCombination; 