class IntegrationYoutube
    include IntegrationHelpers

    def get_api_token(code)
      uri = 'https://www.googleapis.com/oauth2/v4/token'
      data = {
        'client_id' => ENV['GOOGLE_API_CLIENT_ID'],
        'client_secret' => ENV['GOOGLE_API_SECRET'],
        'code' => code,
        'grant_type' => 'authorization_code',
        'access_type'=> 'offline',
        'redirect_uri' => ENV['YOUTUBE_REDIRECT']
      }
      body = post_req(uri, data)
      id = get_account_id(body['access_token'])
      data = { token: body['access_token'], secondary_token: body['refresh_token'], id: id }
    end

    def get_external_resource(integration, query_params, token, company)
      update = check_for_valid_token(integration, company)
      if update['status'] == 'error'
        raise 'YouTube token error'
      else
        case query_params[:resource]
        when 'details'
          data_details(query_params, integration['token'], integration['page_id'])
        else
          data_totals(query_params, integration['token'])
        end
      end
    end

    def data_totals(query_params, token)
      range = get_date_ranges(query_params[:range])
      engagement = get_engagement_range(range[:from],range[:to], token)
      prev_engagement = get_engagement_range(range[:prv_from],range[:prv_to], token)
      subscribers = get_total_subcribers(token)
      if subscribers[:body] == 'error' || engagement[:body] == 'error'
        { error: 'Error pulling YouTube data' }
      else
        {
          type: 'summary',
          reach_text: "#{subscribers[:body]} subscribers",
          reach: subscribers[:body],
          engagement_text: "#{engagement[:body]} comments, shares, and likes",
          engagement: engagement[:body],
          prev_engagement: prev_engagement[:body]
        }
      end
    end

    def data_details(query_params, token, page)
      range = get_date_ranges(query_params[:range])
      engagement = get_engagement_range(range[:from],range[:to], token)
      videos = get_videos(token, page, range)
      if (!videos[:body] || videos[:body].length == 0)
        videos = get_videos(token, page)
      end
      if engagement[:body] == 'error' || videos[:body] == 'error'
        { error: 'Error pulling YouTube data' }
      else
        {
          type: 'details',
          engagement: engagement[:body],
          videos: videos[:body],
          range: query_params[:range]
        }
      end
    end

    def get_videos(token, channel, range=nil)

      uri = "https://www.googleapis.com/youtube/v3/search?channelId=#{channel}&type=video&part=id&order=date&" + ((range)?"publishedAfter=#{range[:from].strftime}T00:00:00Z":'maxResults=5')
      body = get_req(uri, token, 'Bearer')
      if body['items']
        ids = body['items'].map{|item| item['id']['videoId']}
        if ids.length > 0
          uri = "https://www.googleapis.com/youtube/v3/videos/?part=snippet,statistics&id=#{ids.join(',')}"
          body = get_req(uri, token, 'Bearer')
          if body['items']
            { body: body['items']}
          else
            { body: 'error' }
          end
        else
          { body: [] }
        end
      else
        { body: 'error' }
      end
    end

    def get_total_subcribers(token)
      uri = 'https://www.googleapis.com/youtube/v3/channels/?part=snippet%2CcontentDetails%2Cstatistics&mine=true'
      body = get_req(uri, token, 'Bearer')
      if body['items'][0]['statistics']['subscriberCount']
        {body: body['items'][0]['statistics']['subscriberCount']}
      else
        { body: 'error' }
      end
    end

    def get_account_id(token)
      uri = 'https://www.googleapis.com/youtube/v3/channels/?part=snippet%2CcontentDetails&mine=true'
      body = get_req(uri, token, 'Bearer')
      (body['items'] && body['items'][0] && body['items'][0]['id']) || nil
    end

    def get_engagement_range(from, to, token)
      uri = "https://youtubeanalytics.googleapis.com/v2/reports?endDate=#{to.strftime}&ids=channel%3D%3DMINE&metrics=likes%2Cshares%2Ccomments&startDate=#{from.strftime}"
      body = get_req(uri, token, 'Bearer')
      if body['error']
        { body: 'error' }
      else
        if body['rows'] == []
          { body: '0'}
        else
          { body: body['rows'][0].inject(0){|sum,x| sum + x }}
        end
      end
    end

    def check_for_valid_token(integration, company)
      uri = 'https://www.googleapis.com/oauth2/v1/tokeninfo'
      data = {
        'client_id' => ENV['GOOGLE_API_CLIENT_ID'],
        'client_secret' => ENV['GOOGLE_API_SECRET'],
        'access_token' => integration[:token]
      }
      body = post_req(uri, data)
      if body['error'] == 'invalid_token'
        refreshed = refresh_token(integration)
        if refreshed['access_token']
          integration['token'] = refreshed['access_token']
          company.update_integration(integration)
          {'status' => 'updated'}
        else
          {'status' => 'error'}
        end
      else
        {'status' => 'valid'}
      end
    end

    def refresh_token(integration)
      uri = 'https://www.googleapis.com/oauth2/v4/token'
      data = {
        'client_id' => ENV['GOOGLE_API_CLIENT_ID'],
        'client_secret' => ENV['GOOGLE_API_SECRET'],
        'refresh_token' => integration[:secondary_token],
        'grant_type' => 'refresh_token'
      }
      post_req(uri, data)
    end
  end
